package com.healops.core.engine;

import com.healops.core.model.*;
import com.healops.core.orchestrator.OrchestratorService;
import com.healops.core.repository.*;
import com.healops.core.stream.EventBroadcaster;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
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

    // Sliding window of past 3 metric samples per service: serviceId -> List of status indicators
    private final Map<Long, List<Boolean>> failureSlidingWindow = new ConcurrentHashMap<>();
    private final Map<Long, LocalDateTime> lastRecoveryTrigger = new ConcurrentHashMap<>();

    public SelfHealingEngine(
            MonitoredServiceRepository serviceRepository,
            ServiceMetricRepository metricRepository,
            IncidentRepository incidentRepository,
            PolicyRepository policyRepository,
            RecoveryActionRepository recoveryActionRepository,
            OrchestratorService orchestratorService,
            EventBroadcaster broadcaster,
            RestTemplateBuilder restTemplateBuilder
    ) {
        this.serviceRepository = serviceRepository;
        this.metricRepository = metricRepository;
        this.incidentRepository = incidentRepository;
        this.policyRepository = policyRepository;
        this.recoveryActionRepository = recoveryActionRepository;
        this.orchestratorService = orchestratorService;
        this.broadcaster = broadcaster;
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(2000))
                .setReadTimeout(Duration.ofMillis(2500))
                .build();
    }

    /**
     * Polling Loop: Runs every 5 seconds (MAPE-K Closed Loop)
     */
    @Scheduled(fixedRate = 5000)
    public void runClosedLoop() {
        List<MonitoredService> services = serviceRepository.findByEnabledTrue();

        for (MonitoredService service : services) {
            try {
                pollAndAnalyze(service);
            } catch (Exception e) {
                log.error("Error in closed-loop evaluation for {}: {}", service.getName(), e.getMessage());
            }
        }
    }

    private void pollAndAnalyze(MonitoredService service) {
        long start = System.currentTimeMillis();
        boolean isUp = false;
        boolean dbUp = true;
        double cpu = 5.0;
        double memory = 120.0;
        long responseTime = 0;
        double errorRate = 0.0;
        FailureType detectedFailure = null;

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    service.getHealthUrl(),
                    HttpMethod.GET,
                    null,
                    String.class
            );
            responseTime = System.currentTimeMillis() - start;

            if (response.getStatusCode().is2xxSuccessful()) {
                isUp = true;
                String body = response.getBody();
                if (body != null && body.contains("\"status\":")) {
                    if (body.contains("\"status\":\"DOWN\"") || body.contains("\"status\":\"OUT_OF_SERVICE\"")) {
                        isUp = false;
                    }
                    if (body.contains("\"db\":{\"status\":\"DOWN\"}")) {
                        dbUp = false;
                        detectedFailure = FailureType.DATABASE_LOST;
                    }
                }
            } else if (response.getStatusCode().is5xxServerError()) {
                isUp = false;
                errorRate = 100.0;
                detectedFailure = FailureType.HTTP_5XX_ERRORS;
            }
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
        if (service.getChaosUrl() != null) {
            try {
                Map<String, Object> chaos = restTemplate.getForObject(service.getChaosUrl() + "/status", Map.class);
                if (chaos != null) {
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

        // Record metrics
        ServiceMetric metric = new ServiceMetric(service, cpu, memory, responseTime, errorRate, dbUp, isUp ? "RUNNING" : "STOPPED");
        metricRepository.save(metric);

        // Update sliding window (true if failure breach detected)
        boolean hasBreach = (!isUp || detectedFailure != null);
        failureSlidingWindow.putIfAbsent(service.getId(), new ArrayList<>());
        List<Boolean> window = failureSlidingWindow.get(service.getId());
        window.add(hasBreach);
        if (window.size() > 3) {
            window.remove(0);
        }

        // Sliding window rule: 3 consecutive breaches trigger critical self-healing
        long breachCount = window.stream().filter(b -> b).count();

        if (breachCount == 0) {
            service.setCurrentStatus(ServiceStatus.HEALTHY);
            service.setHealthScore(100);
        } else if (breachCount < 3) {
            service.setCurrentStatus(ServiceStatus.WARNING);
            service.setHealthScore(65);
        } else {
            service.setCurrentStatus(ServiceStatus.CRITICAL);
            service.setHealthScore(15);
            if (detectedFailure == null) {
                detectedFailure = FailureType.SERVICE_CRASH;
            }
            triggerSelfHealing(service, detectedFailure);
        }

        service.setLastPolledAt(LocalDateTime.now());
        serviceRepository.save(service);

        // Broadcast to React frontend
        broadcaster.broadcast("METRIC_UPDATE", Map.of(
                "serviceId", service.getId(),
                "serviceName", service.getName(),
                "status", service.getCurrentStatus(),
                "healthScore", service.getHealthScore(),
                "cpu", cpu,
                "memory", memory,
                "responseTime", responseTime,
                "errorRate", errorRate
        ));
    }

    private synchronized void triggerSelfHealing(MonitoredService service, FailureType failureType) {
        LocalDateTime lastTime = lastRecoveryTrigger.get(service.getId());
        // Cooldown: at least 15s between recovery steps
        if (lastTime != null && Duration.between(lastTime, LocalDateTime.now()).getSeconds() < 15) {
            return;
        }

        lastRecoveryTrigger.put(service.getId(), LocalDateTime.now());

        log.warn("🚨 [SelfHealing] Active Failure Detected for {} -> {}", service.getName(), failureType);

        // Formulate Explainable Recommendation
        String recommendedAction = determineRecommendedAction(failureType);
        String reason = explainReasoning(failureType, recommendedAction);
        Long estimatedMttrMs = estimateMttr(failureType);

        Incident incident = new Incident(
                service,
                failureType,
                "CRITICAL",
                "Breach detected: " + failureType.name(),
                recommendedAction,
                reason,
                estimatedMttrMs
        );
        incident.setMttdMs(15000L); // 3 * 5s sliding window
        incidentRepository.save(incident);

        broadcaster.broadcast("INCIDENT_TRIGGERED", incident);

        // Execute Escalation Action
        RecoveryAction actionLog = new RecoveryAction(incident, 1, recommendedAction);
        boolean actionResult = orchestratorService.executeRecovery(
                recommendedAction,
                service.getName(),
                service.getContainerName(),
                service.getChaosUrl(),
                service.getPort()
        );

        actionLog.setEndedAt(LocalDateTime.now());
        actionLog.setResult(actionResult ? "SUCCESS" : "FAILED");
        actionLog.setExecutionLog("Executed action step: " + recommendedAction + " with result: " + actionLog.getResult());
        recoveryActionRepository.save(actionLog);

        if (actionResult) {
            incident.setStatus("RECOVERED");
            incident.setResolvedAt(LocalDateTime.now());
            incident.setMttrMs(Duration.between(incident.getDetectedAt(), incident.getResolvedAt()).toMillis());
            incidentRepository.save(incident);
            service.setCurrentStatus(ServiceStatus.HEALTHY);
            service.setHealthScore(95);
            serviceRepository.save(service);
            failureSlidingWindow.get(service.getId()).clear();
            broadcaster.broadcast("INCIDENT_RESOLVED", incident);
        } else {
            incident.setStatus("UNRESOLVED");
            incidentRepository.save(incident);
            broadcaster.broadcast("INCIDENT_ESCALATED", incident);
        }
    }

    private String determineRecommendedAction(FailureType failureType) {
        return switch (failureType) {
            case DATABASE_LOST -> "RECONNECT_DB_POOL";
            case HIGH_MEMORY -> "FORCE_JVM_GC";
            case SLOW_RESPONSE -> "RESET_CIRCUIT_BREAKER";
            case HIGH_CPU, HTTP_5XX_ERRORS -> "CLEAR_CHAOS";
            case SERVICE_CRASH, CONTAINER_STOPPED, NETWORK_TIMEOUT -> "RESTART_CONTAINER";
        };
    }

    private String explainReasoning(FailureType failureType, String action) {
        return switch (failureType) {
            case DATABASE_LOST -> "Database connection pool unreachable. Triggering Hikari pool refresh/reconnect as cheapest step.";
            case HIGH_CPU -> "CPU spiked over 95% threshold across consecutive samples. Clearing CPU stress burner threads.";
            case HIGH_MEMORY -> "Memory saturation detected above safety threshold. Forcing JVM Garbage Collection and buffer release.";
            case SLOW_RESPONSE -> "Response latency exceeded 3000ms SLA. Tripping circuit breaker to shed load and clearing delay.";
            case HTTP_5XX_ERRORS -> "5xx error spikes detected in sliding window. Clearing faulty mock state.";
            case SERVICE_CRASH, CONTAINER_STOPPED, NETWORK_TIMEOUT -> "Target process unreachable across 3 probes. Escalating to container/process restart.";
        };
    }

    private Long estimateMttr(FailureType failureType) {
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
