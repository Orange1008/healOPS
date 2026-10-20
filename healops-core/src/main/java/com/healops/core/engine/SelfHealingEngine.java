package com.healops.core.engine;

import com.healops.core.model.*;
import com.healops.core.orchestrator.OrchestratorService;
import com.healops.core.repository.*;
import com.healops.core.stream.EventBroadcaster;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.core.task.TaskExecutor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SelfHealingEngine {

    private static final Logger log = LoggerFactory.getLogger(SelfHealingEngine.class);

    private final MonitoredServiceRepository serviceRepository;
    private final ServiceMetricRepository metricRepository;
    private final IncidentRepository incidentRepository;
    private final PolicyRepository policyRepository;
    private final RecoveryActionRepository recoveryActionRepository;
    private final OrchestratorService orchestratorService;
    private final EventBroadcaster broadcaster;
    private final RestTemplate restTemplate;
    private final TaskExecutor healthProbeExecutor;
    private final long pollIntervalMs;
    private final ObjectMapper objectMapper;
    private final double cpuThresholdPercent;
    private final double heapThresholdRatio;
    private final long slowResponseThresholdMs;
    private final long metricsRetentionHours;
    private volatile boolean monitoringReady;

    // Sliding window of past 3 metric samples per service: serviceId -> List of status indicators
    private final Map<Long, List<Boolean>> failureSlidingWindow = new ConcurrentHashMap<>();
    private final Set<Long> probesInFlight = ConcurrentHashMap.newKeySet();
    private final Map<Long, Object> recoveryLocks = new ConcurrentHashMap<>();

    public SelfHealingEngine(
            MonitoredServiceRepository serviceRepository,
            ServiceMetricRepository metricRepository,
            IncidentRepository incidentRepository,
            PolicyRepository policyRepository,
            RecoveryActionRepository recoveryActionRepository,
            OrchestratorService orchestratorService,
            EventBroadcaster broadcaster,
            RestTemplateBuilder restTemplateBuilder,
            @org.springframework.beans.factory.annotation.Qualifier("healthProbeExecutor") TaskExecutor healthProbeExecutor,
            @Value("${healops.monitoring.poll-interval-ms:5000}") long pollIntervalMs,
            ObjectMapper objectMapper,
            @Value("${healops.detection.cpu-threshold-percent:90}") double cpuThresholdPercent,
            @Value("${healops.detection.heap-threshold-ratio:0.85}") double heapThresholdRatio,
            @Value("${healops.detection.slow-response-ms:2000}") long slowResponseThresholdMs,
            @Value("${healops.metrics.retention-hours:24}") long metricsRetentionHours
    ) {
        this.serviceRepository = serviceRepository;
        this.metricRepository = metricRepository;
        this.incidentRepository = incidentRepository;
        this.policyRepository = policyRepository;
        this.recoveryActionRepository = recoveryActionRepository;
        this.orchestratorService = orchestratorService;
        this.broadcaster = broadcaster;
        this.healthProbeExecutor = healthProbeExecutor;
        this.pollIntervalMs = pollIntervalMs;
        this.objectMapper = objectMapper;
        this.cpuThresholdPercent = cpuThresholdPercent;
        this.heapThresholdRatio = heapThresholdRatio;
        this.slowResponseThresholdMs = slowResponseThresholdMs;
        this.metricsRetentionHours = metricsRetentionHours;
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(1000))
                .setReadTimeout(Duration.ofMillis(2000))
                .build();
    }

    /**
     * Polling Loop: Runs every 5 seconds (MAPE-K Closed Loop)
     */
    @Scheduled(fixedDelayString = "${healops.monitoring.poll-interval-ms:5000}", initialDelay = 15000)
    public void runClosedLoop() {
        // @Scheduled tasks can fire while ApplicationRunner migrations are still
        // executing. Do not let startup probes compete for JDBC connections until
        // Spring has completed runners and published ApplicationReadyEvent.
        if (!monitoringReady) return;

        List<MonitoredService> services = serviceRepository.findByEnabledTrue();

        for (MonitoredService service : services) {
            Long serviceId = service.getId();
            if (serviceId == null || !probesInFlight.add(serviceId)) continue;
            try {
                healthProbeExecutor.execute(() -> {
                    try { pollAndAnalyze(service); }
                    catch (Exception e) { log.error("Error in closed-loop evaluation for {}: {}", service.getName(), e.getMessage()); }
                    finally { probesInFlight.remove(serviceId); }
                });
            } catch (org.springframework.core.task.TaskRejectedException rejected) {
                probesInFlight.remove(serviceId);
                log.warn("Health probe queue is full; deferring probe for {}", service.getName());
            }
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    void enableMonitoringAfterApplicationReady() {
        monitoringReady = true;
        log.info("Monitoring enabled after application startup and database migrations completed");
    }

    /** Keep the persistent telemetry database bounded while retaining recent diagnostics. */
    @Scheduled(cron = "${healops.metrics.cleanup-cron:0 15 3 * * *}")
    public void pruneOldMetrics() {
        // Cleanup is also JDBC work, so it must not race schema migration during startup.
        if (!monitoringReady) return;

        long removed = metricRepository.deleteByCollectedAtBefore(LocalDateTime.now().minusHours(metricsRetentionHours));
        if (removed > 0) log.info("Pruned {} telemetry samples older than {} hours", removed, metricsRetentionHours);
    }

    private void pollAndAnalyze(MonitoredService service) {
        long start = System.currentTimeMillis();
        boolean isUp = false;
        boolean dbUp = true;
        Double cpu = null;
        Double memory = null;
        long responseTime = 0;
        double errorRate = 0.0;
        FailureType detectedFailure = null;
        boolean healthEndpointReachable = false;

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    service.getHealthUrl(),
                    HttpMethod.GET,
                    null,
                    String.class
            );
            healthEndpointReachable = true;
            responseTime = System.currentTimeMillis() - start;

            if (response.getStatusCode().is2xxSuccessful()) {
                isUp = true;
                // Public website targets often return HTML. Their availability is
                // determined by the HTTP/TLS exchange, not by parsing a body as JSON.
                String body = response.getBody();
                if (service.getCategory() != ServiceCategory.EXTERNAL_API && body != null && !body.isBlank()) {
                    JsonNode health = objectMapper.readTree(body);
                    String overallStatus = health.path("status").asText("UNKNOWN");
                    if ("DOWN".equalsIgnoreCase(overallStatus) || "OUT_OF_SERVICE".equalsIgnoreCase(overallStatus))
                        isUp = false;
                    JsonNode databaseStatus = health.path("components").path("db").path("status");
                    if (databaseStatus.isTextual() && !"UP".equalsIgnoreCase(databaseStatus.asText())) {
                        dbUp = false;
                        detectedFailure = FailureType.DATABASE_LOST;
                    }
                }
            } else if (response.getStatusCode().is5xxServerError()) {
                isUp = false;
                errorRate = 100.0;
                detectedFailure = FailureType.HTTP_5XX_ERRORS;
            }
        } catch (HttpStatusCodeException httpError) {
            responseTime = System.currentTimeMillis() - start;
            isUp = false;
            errorRate = 100.0;
            detectedFailure = FailureType.HTTP_5XX_ERRORS;
        } catch (ResourceAccessException rae) {
            responseTime = System.currentTimeMillis() - start;
            isUp = false;
            detectedFailure = (responseTime > 2000) ? FailureType.NETWORK_TIMEOUT : FailureType.SERVICE_CRASH;
        } catch (Exception ex) {
            responseTime = System.currentTimeMillis() - start;
            isUp = false;
            detectedFailure = FailureType.SERVICE_CRASH;
        }

        // Query Chaos Endpoint state if available to detect active chaos simulations
        if (healthEndpointReachable && service.getChaosUrl() != null) {
            try {
                Map<String, Object> chaos = restTemplate.getForObject(service.getChaosUrl() + "/status", Map.class);
                if (chaos != null) {
                    if (Boolean.TRUE.equals(chaos.get("databaseLostActive"))) {
                        dbUp = false;
                        detectedFailure = FailureType.DATABASE_LOST;
                    }
                    if (Boolean.TRUE.equals(chaos.get("serviceCrashActive"))) {
                        detectedFailure = FailureType.SERVICE_CRASH;
                    }
                    if (Boolean.TRUE.equals(chaos.get("cpuBurnActive"))) {
                        cpu = 98.5;
                        detectedFailure = FailureType.HIGH_CPU;
                    }
                    if (Boolean.TRUE.equals(chaos.get("return500Active"))) {
                        errorRate = 85.0;
                        detectedFailure = FailureType.HTTP_5XX_ERRORS;
                    }
                    int leakedMb = (chaos.get("leakedMemoryMB") != null) ? ((Number) chaos.get("leakedMemoryMB")).intValue() : 0;
                    if (leakedMb > 0) {
                        if (memory == null) memory = 0.0;
                        memory += leakedMb;
                        if (memory > 300) {
                            detectedFailure = FailureType.HIGH_MEMORY;
                        }
                    }
                    long latency = (chaos.get("injectedLatencyMs") != null) ? ((Number) chaos.get("injectedLatencyMs")).longValue() : 0;
                    if (latency > 0) {
                        responseTime = latency;
                        if (latency >= 3000) {
                            detectedFailure = FailureType.SLOW_RESPONSE;
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        // Read real Micrometer process telemetry when the target exposes it.
        // Chaos endpoints still override these values for deterministic demos.
        if (healthEndpointReachable && service.getMetricsUrl() != null && !service.getMetricsUrl().isBlank()) {
            double processCpu = readMetric(service.getMetricsUrl() + "/process.cpu.usage");
            double heapBytes = readMetric(service.getMetricsUrl() + "/jvm.memory.used?tag=area:heap");
            double heapMaxBytes = readMetric(service.getMetricsUrl() + "/jvm.memory.max?tag=area:heap");
            if (processCpu >= 0) cpu = Math.min(100.0, processCpu * 100.0);
            if (heapBytes >= 0) memory = heapBytes / (1024.0 * 1024.0);
            if (cpu != null && cpu >= cpuThresholdPercent) detectedFailure = FailureType.HIGH_CPU;
            if (heapBytes >= 0 && heapMaxBytes > 0 && heapBytes / heapMaxBytes >= heapThresholdRatio)
                detectedFailure = FailureType.HIGH_MEMORY;
        }
        if (service.getCategory() != ServiceCategory.EXTERNAL_API
                && isUp && responseTime >= slowResponseThresholdMs && detectedFailure == null)
            detectedFailure = FailureType.SLOW_RESPONSE;

        if (!service.isEnabled()) return;

        // Record metrics
        String runningState = service.getCategory() == ServiceCategory.EXTERNAL_API
                ? (isUp ? "AVAILABLE" : "UNREACHABLE")
                : (isUp ? "RUNNING" : "STOPPED");
        ServiceMetric metric = new ServiceMetric(service, cpu, memory, responseTime, errorRate, dbUp, runningState);
        metricRepository.save(metric);

        // Update sliding window (true if failure breach detected)
        boolean hasBreach = (!isUp || detectedFailure != null);
        List<Boolean> window = failureSlidingWindow.compute(service.getId(), (id, previous) -> {
            List<Boolean> next = previous == null ? new ArrayList<>() : new ArrayList<>(previous);
            next.add(hasBreach);
            if (next.size() > 3) next.remove(0);
            return next;
        });

        // Sliding window rule: 3 consecutive breaches trigger critical self-healing
        long breachCount = window.stream().filter(b -> b).count();
        boolean monitorOnlyIncident = false;

        if (breachCount == 0) {
            service.setCurrentStatus(ServiceStatus.HEALTHY);
            service.setHealthScore(100);
            // A failure is considered recovered only after three clean probes.
            // Close any incident left open by an unsuccessful recovery attempt.
            if (window.size() == 3) {
                resolveOpenIncidents(service);
            }
        } else if (breachCount < 3) {
            service.setCurrentStatus(ServiceStatus.WARNING);
            service.setHealthScore(65);
        } else {
            service.setCurrentStatus(ServiceStatus.CRITICAL);
            service.setHealthScore(15);
            if (detectedFailure == null) {
                detectedFailure = FailureType.SERVICE_CRASH;
            }
            if (service.getCategory() == ServiceCategory.EXTERNAL_API) {
                monitorOnlyIncident = true;
            } else {
                triggerSelfHealing(service, detectedFailure, null);
            }
        }

        LocalDateTime polledAt = LocalDateTime.now();
        service.setLastPolledAt(polledAt);
        if (serviceRepository.updateProbeStateIfEnabled(service.getId(), service.getCurrentStatus(),
                service.getHealthScore(), polledAt) == 0) return;

        if (monitorOnlyIncident && serviceRepository.findById(service.getId())
                .filter(MonitoredService::isEnabled).isPresent()) {
            createMonitorOnlyIncident(service, detectedFailure);
        }

        // Broadcast to React frontend
        broadcaster.broadcast("METRIC_UPDATE", Map.of(
                "serviceId", service.getId(),
                "serviceName", service.getName(),
                "status", service.getCurrentStatus(),
                "healthScore", service.getHealthScore(),
                "cpu", cpu == null ? "N/A" : cpu,
                "memory", memory == null ? "N/A" : memory,
                "responseTime", responseTime,
                "errorRate", errorRate
        ));
    }

    /**
     * Explicit Chaos Studio actions are known faults, so do not make them wait
     * for three background polling samples (which can outlast short injections).
     */
    public void handleInjectedFault(MonitoredService service, FailureType failureType) {
        if (service == null || failureType == null) return;
        if (service.getCategory() == ServiceCategory.EXTERNAL_API) return;
        failureSlidingWindow.compute(service.getId(), (id, current) ->
                new ArrayList<>(List.of(true, true, true)));

        // The /crash endpoint models an outage flag in the application; it does
        // not terminate the JVM. Clear that simulated flag rather than rebooting
        // the whole container. Real unreachable containers still use Docker restart.
        String actionOverride = failureType == FailureType.SERVICE_CRASH ? "CLEAR_CHAOS" : null;
        triggerSelfHealing(service, failureType, actionOverride);
    }

    public void forgetMonitoringState(Long serviceId) {
        failureSlidingWindow.remove(serviceId);
        recoveryLocks.remove(serviceId);
    }

    private void createMonitorOnlyIncident(MonitoredService service, FailureType failureType) {
        Optional<Incident> existing = incidentRepository.findFirstByServiceIdAndStatusInOrderByDetectedAtDesc(
                service.getId(), List.of("IN_PROGRESS", "UNRESOLVED"));
        if (existing.isPresent()) {
            Incident incident = existing.get();
            incident.setFailureType(failureType);
            incident.setSeverity("INFO");
            incident.setStatus("UNRESOLVED");
            incident.setIssueDescription("The external endpoint failed three consecutive health probes: " + service.getHealthUrl());
            incident.setRecommendedAction("MONITOR_ONLY");
            incident.setDecisionReason("The external endpoint failed three consecutive health probes. "
                    + "HealOps cannot recover third-party systems. Monitoring continues until the endpoint becomes healthy.");
            incident.setEstimatedMttrMs(null);
            incidentRepository.save(incident);
            broadcaster.broadcast("INCIDENT_UPDATED", incident);
            return;
        }

        Incident incident = new Incident(service, failureType, "INFO",
                "The external endpoint failed three consecutive health probes: " + service.getHealthUrl(),
                "MONITOR_ONLY",
                "The external endpoint failed three consecutive health probes. "
                        + "HealOps cannot recover third-party systems. Monitoring continues until the endpoint becomes healthy.",
                null);
        incident.setStatus("UNRESOLVED");
        incident.setMttdMs(pollIntervalMs * 3);
        incidentRepository.save(incident);
        broadcaster.broadcast("INCIDENT_TRIGGERED", incident);
        log.warn("External target {} is unavailable; recording monitor-only incident without recovery", service.getName());
    }

    private void triggerSelfHealing(
            MonitoredService service,
            FailureType failureType,
            String actionOverride
    ) {
        if (service.getId() == null || service.getCategory() == ServiceCategory.EXTERNAL_API) return;
        Object lock = recoveryLocks.computeIfAbsent(service.getId(), ignored -> new Object());
        synchronized (lock) {
            performRecovery(service, failureType, actionOverride);
        }
    }

    private void performRecovery(
            MonitoredService service,
            FailureType failureType,
            String actionOverride
    ) {
        Optional<Incident> openIncident = incidentRepository
                .findFirstByServiceIdAndStatusInOrderByDetectedAtDesc(
                        service.getId(), List.of("IN_PROGRESS", "UNRESOLVED"));
        Incident incident = openIncident.orElse(null);
        List<RecoveryAction> previousActions = incident == null
                ? List.of()
                : recoveryActionRepository.findByIncidentIdOrderByStepNumberAsc(incident.getId());

        if (openIncident.isPresent()) {
            Incident active = openIncident.get();
            if ("IN_PROGRESS".equals(active.getStatus())) {
                boolean restartInProgress = ("RESTART_CONTAINER".equals(active.getRecommendedAction())
                        || "RESTART_SERVICE".equals(active.getRecommendedAction()))
                        && recoveryActionRepository.findByIncidentIdOrderByStepNumberAsc(active.getId()).stream()
                        .anyMatch(recovery -> "SUCCESS".equals(recovery.getResult()));
                // A successful command is not proof of recovery; wait for
                // health verification, but let failed remediation retry later.
                service.setCurrentStatus(ServiceStatus.RECOVERING);
                service.setHealthScore(45);
                serviceRepository.save(service);
                long verificationLimitSeconds = restartInProgress ? 600 : 60;
                if (Duration.between(active.getDetectedAt(), LocalDateTime.now()).toSeconds()
                        <= verificationLimitSeconds) return;
                active.setStatus("UNRESOLVED");
                incidentRepository.save(active);
                service.setCurrentStatus(ServiceStatus.CRITICAL);
                service.setHealthScore(15);
                serviceRepository.save(service);
            }
        }

        RecoveryStep step = selectRecoveryStep(service, failureType, actionOverride, previousActions);
        if (step == null) {
            // An exhausted unresolved incident has no remediation to retry.
            // Avoid writing the same state and emitting an error every poll;
            // if an operator later enables a policy, step becomes non-null and
            // the normal recovery path can continue.
            if (incident != null && "UNRESOLVED".equals(incident.getStatus())) return;
            if (incident == null) {
                incident = new Incident(service, failureType, "CRITICAL", "Breach detected: " + failureType.name(),
                        "NOTIFY_ADMIN", "No enabled recovery policy remains for this failure type.", estimateMttr(failureType));
                incident.setMttdMs(pollIntervalMs * 3);
            }
            boolean newlyUnresolved = !"UNRESOLVED".equals(incident.getStatus());
            incident.setStatus("UNRESOLVED");
            incidentRepository.save(incident);
            if (newlyUnresolved) broadcaster.broadcast("INCIDENT_ESCALATED", incident);
            log.error("Recovery policy exhausted or unavailable for {} ({})", service.getName(), failureType);
            return;
        }

        if (!previousActions.isEmpty()) {
            LocalDateTime lastActionAt = previousActions.get(previousActions.size() - 1).getStartedAt();
            if (lastActionAt != null && Duration.between(lastActionAt, LocalDateTime.now()).getSeconds()
                    < step.cooldownSeconds()) return;
        }

        // Persist and publish the recovering state before the reset finishes so
        // both dashboards can show the live recovery instead of only its result.
        service.setCurrentStatus(ServiceStatus.RECOVERING);
        service.setHealthScore(45);
        serviceRepository.save(service);

        log.warn("🚨 [SelfHealing] Active Failure Detected for {} -> {}", service.getName(), failureType);

        // Formulate Explainable Recommendation
        String recommendedAction = step.action();
        String issueDescription = actionOverride != null
                ? "Chaos Studio injected " + failureType.name().replace('_', ' ').toLowerCase(Locale.ROOT) + "."
                : diagnoseFailure(failureType);
        String reason = explainReasoning(failureType, recommendedAction, actionOverride, step.stepNumber());
        Long estimatedMttrMs = estimateMttr(failureType, recommendedAction);

        if (incident == null) {
            incident = new Incident(service, failureType, "CRITICAL", issueDescription,
                    recommendedAction, reason, estimatedMttrMs);
            incident.setMttdMs(pollIntervalMs * 3);
            incidentRepository.save(incident);
            broadcaster.broadcast("INCIDENT_TRIGGERED", incident);
        } else {
            incident.setIssueDescription(issueDescription);
            incident.setRecommendedAction(recommendedAction);
            incident.setEstimatedMttrMs(estimatedMttrMs);
            incident.setDecisionReason(reason);
            incidentRepository.save(incident);
        }

        // Execute Escalation Action
        RecoveryAction actionLog = new RecoveryAction(incident, step.stepNumber(), recommendedAction);
        boolean restartAction = "RESTART_CONTAINER".equals(recommendedAction)
                || "RESTART_SERVICE".equals(recommendedAction);
        boolean actionResult = orchestratorService.executeRecovery(
                recommendedAction,
                service.getName(),
                service.getContainerName(),
                service.getChaosUrl(),
                service.getPort()
        );

        actionLog.setEndedAt(LocalDateTime.now());
        actionLog.setResult(actionResult ? "SUCCESS" : "FAILED");
        actionLog.setExecutionLog(actionResult && restartAction
                ? "Docker restart accepted; waiting for three consecutive healthy probes."
                : "Executed action step: " + recommendedAction + " with result: " + actionLog.getResult());
        recoveryActionRepository.save(actionLog);

        if (actionResult) {
            if ("NOTIFY_ADMIN".equals(recommendedAction)) {
                incident.setStatus("UNRESOLVED");
                incidentRepository.save(incident);
                broadcaster.broadcast("INCIDENT_ESCALATED", incident);
                return;
            }
            // A successful command only means remediation was accepted. The
            // incident closes after the monitor sees three clean health checks.
            incident.setStatus("IN_PROGRESS");
            incidentRepository.save(incident);
            service.setCurrentStatus(ServiceStatus.RECOVERING);
            service.setHealthScore(45);
            serviceRepository.save(service);
            log.info("Recovery action {} accepted for {}; verifying three healthy probes for incident {}",
                    recommendedAction, service.getName(), incident.getId());
        } else {
            incident.setStatus("UNRESOLVED");
            incidentRepository.save(incident);
            broadcaster.broadcast("INCIDENT_ESCALATED", incident);
        }
    }

    private RecoveryStep selectRecoveryStep(MonitoredService service, FailureType failureType,
                                             String actionOverride, List<RecoveryAction> previousActions) {
        if (actionOverride != null && previousActions.isEmpty()) {
            return new RecoveryStep(actionOverride, 1, 15);
        }
        for (Policy policy : policyRepository.findByFailureTypeAndEnabledTrueOrderByStepNumberAsc(failureType)) {
            long attempts = previousActions.stream()
                    .filter(action -> policy.getAction().equals(action.getActionName())).count();
            if (attempts < Math.max(1, policy.getMaxRetries())) {
                return new RecoveryStep(policy.getAction(), policy.getStepNumber(),
                        Math.max(1, policy.getCooldownSeconds()));
            }
        }
        return null;
    }

    private record RecoveryStep(String action, int stepNumber, int cooldownSeconds) {}

    private void resolveOpenIncidents(MonitoredService service) {
        List<Incident> incidents = incidentRepository.findByServiceIdOrderByDetectedAtDesc(service.getId());
        LocalDateTime recoveredAt = LocalDateTime.now();
        for (Incident incident : incidents) {
            if (!"IN_PROGRESS".equals(incident.getStatus()) && !"UNRESOLVED".equals(incident.getStatus())) {
                continue;
            }
            incident.setStatus("RECOVERED");
            incident.setResolvedAt(recoveredAt);
            incident.setMttrMs(Duration.between(incident.getDetectedAt(), recoveredAt).toMillis());
            incidentRepository.save(incident);
            broadcaster.broadcast("INCIDENT_RESOLVED", incident);
        }
    }

    @SuppressWarnings("unchecked")
    private double readMetric(String url) {
        try {
            Map<String, Object> metric = restTemplate.getForObject(url, Map.class);
            Object measurements = metric == null ? null : metric.get("measurements");
            if (measurements instanceof List<?> values && !values.isEmpty()
                    && values.get(0) instanceof Map<?, ?> measurement
                    && measurement.get("value") instanceof Number value) {
                return value.doubleValue();
            }
        } catch (Exception ignored) {
            // Some monitored targets or Actuator versions may not expose this meter.
        }
        return -1;
    }

    private String explainReasoning(FailureType failureType, String action, String actionOverride, int stepNumber) {
        String evidence = actionOverride != null
                ? "The fault was explicitly injected through Chaos Studio."
                : "The failure condition persisted for three consecutive monitoring samples.";
        String diagnosis = diagnoseFailure(failureType);
        String policyReason = switch (action) {
            case "CLEAR_CHAOS" -> "Clearing the simulated fault is the lowest-impact recovery for this injected failure.";
            case "RECONNECT_DB_POOL" -> "The configured policy tries to restore database connections before restarting the service.";
            case "RESTART_SERVICE" -> "The configured policy restarts the affected service to restore its runtime state.";
            case "RESTART_CONTAINER" -> "The configured policy restarts the stopped or unresponsive container.";
            case "ALERT_ADMIN", "NOTIFY_ADMIN" -> "No automatic remediation remains enabled, so the policy escalates to an operator.";
            default -> "This is the enabled recovery action selected by the policy for this failure type.";
        };
        return evidence + " " + diagnosis + " Selected policy step " + stepNumber + " (" + action + "): " + policyReason;
    }

    private String diagnoseFailure(FailureType failureType) {
        return switch (failureType) {
            case DATABASE_LOST -> "The database health check or connection pool reported an unavailable connection.";
            case HIGH_CPU -> "Observed CPU usage exceeded the configured threshold.";
            case HIGH_MEMORY -> "Observed JVM heap usage exceeded the configured memory threshold.";
            case SLOW_RESPONSE -> "The service response time exceeded the configured latency threshold.";
            case HTTP_5XX_ERRORS -> "The service health probe returned an HTTP 5xx response.";
            case SERVICE_CRASH -> "The service health endpoint was unreachable or its simulated crash flag was active.";
            case CONTAINER_STOPPED -> "The monitored container was reported stopped or unreachable.";
            case NETWORK_TIMEOUT -> "The health probe exceeded its response timeout.";
        };
    }

    private Long estimateMttr(FailureType failureType) {
        return estimateMttr(failureType, null);
    }

    private Long estimateMttr(FailureType failureType, String action) {
        if ("CLEAR_CHAOS".equals(action)) return 1500L;
        if ("RECONNECT_DB_POOL".equals(action)) return 3200L;
        if ("RESTART_CONTAINER".equals(action) || "RESTART_SERVICE".equals(action)) return 5500L;
        if ("ALERT_ADMIN".equals(action) || "NOTIFY_ADMIN".equals(action)) return null;
        return switch (failureType) {
            case DATABASE_LOST -> 3200L;
            case HIGH_CPU -> 1800L;
            case HIGH_MEMORY -> 2400L;
            case SLOW_RESPONSE -> 1500L;
            case HTTP_5XX_ERRORS -> 1200L;
            case SERVICE_CRASH, CONTAINER_STOPPED, NETWORK_TIMEOUT -> 5500L;
        };
    }
}
