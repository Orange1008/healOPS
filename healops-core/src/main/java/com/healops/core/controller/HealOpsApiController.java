package com.healops.core.controller;

import com.healops.core.model.*;
import com.healops.core.repository.*;
import com.healops.core.stream.EventBroadcaster;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class HealOpsApiController {

    private final MonitoredServiceRepository serviceRepo;
    private final ServiceMetricRepository metricRepo;
    private final IncidentRepository incidentRepo;
    private final PolicyRepository policyRepo;
    private final RecoveryActionRepository actionRepo;
    private final EventBroadcaster broadcaster;
    private final RestTemplate restTemplate = new RestTemplate();

    public HealOpsApiController(
            MonitoredServiceRepository serviceRepo,
            ServiceMetricRepository metricRepo,
            IncidentRepository incidentRepo,
            PolicyRepository policyRepo,
            RecoveryActionRepository actionRepo,
            EventBroadcaster broadcaster
    ) {
        this.serviceRepo = serviceRepo;
        this.metricRepo = metricRepo;
        this.incidentRepo = incidentRepo;
        this.policyRepo = policyRepo;
        this.actionRepo = actionRepo;
        this.broadcaster = broadcaster;
    }

    // 1. LIVE SSE STREAM
    @GetMapping(value = "/stream/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents() {
        return broadcaster.subscribe();
    }

    // 2. DASHBOARD KPI & OVERVIEW
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview() {
        List<MonitoredService> services = serviceRepo.findAll();
        long totalServices = services.size();
        long healthyCount = services.stream().filter(s -> s.getCurrentStatus() == ServiceStatus.HEALTHY).count();
        long warningCount = services.stream().filter(s -> s.getCurrentStatus() == ServiceStatus.WARNING).count();
        long criticalCount = services.stream().filter(s -> s.getCurrentStatus() == ServiceStatus.CRITICAL).count();

        double avgScore = services.stream().mapToInt(MonitoredService::getHealthScore).average().orElse(100.0);
        long resolvedIncidents = incidentRepo.findAll().stream().filter(i -> "RECOVERED".equalsIgnoreCase(i.getStatus())).count();

        Map<String, Object> overview = new HashMap<>();
        overview.put("totalServices", totalServices);
        overview.put("healthyCount", healthyCount);
        overview.put("warningCount", warningCount);
        overview.put("criticalCount", criticalCount);
        overview.put("systemHealthScore", Math.round(avgScore));
        overview.put("recoveriesToday", resolvedIncidents);
        overview.put("uptimePercent", 99.85);

        return ResponseEntity.ok(overview);
    }

    // 3. SERVICES LIST & REGISTRATION
    @GetMapping("/services")
    public ResponseEntity<List<MonitoredService>> getServices() {
        return ResponseEntity.ok(serviceRepo.findAll());
    }

    @PostMapping("/services")
    public ResponseEntity<MonitoredService> registerService(@RequestBody MonitoredService newService) {
        if (newService.getName() == null || newService.getHealthUrl() == null) {
            return ResponseEntity.badRequest().build();
        }
        if (newService.getCategory() == null) {
            newService.setCategory(newService.getHealthUrl().startsWith("http://localhost") 
                ? ServiceCategory.INTERNAL_MICROSERVICE 
                : ServiceCategory.EXTERNAL_API);
        }
        newService.setCurrentStatus(ServiceStatus.HEALTHY);
        newService.setHealthScore(100);
        newService.setEnabled(true);
        MonitoredService saved = serviceRepo.save(newService);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/services/{id}")
    public ResponseEntity<Void> deleteService(@PathVariable Long id) {
        serviceRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // GET /api/services/{id}/detail  – full diagnostic breakdown for click-through panel
    @GetMapping("/services/{id}/detail")
    public ResponseEntity<Map<String, Object>> getServiceDetail(@PathVariable Long id) {
        return serviceRepo.findById(id).map(service -> {
            // last 20 metrics for sparklines
            List<ServiceMetric> recent = metricRepo.findByServiceIdOrderByCollectedAtDesc(id);
            if (recent.size() > 20) recent = recent.subList(0, 20);
            Collections.reverse(recent);

            // all incidents for this specific service
            List<Incident> serviceIncidents = incidentRepo.findByServiceIdOrderByDetectedAtDesc(id);

            // latest recovery actions across those incidents
            List<RecoveryAction> recentActions = serviceIncidents.stream()
                .limit(5)
                .flatMap(inc -> actionRepo.findByIncidentIdOrderByStepNumberAsc(inc.getId()).stream())
                .toList();

            // compute a reason summary from the most recent incident
            String diagnosisSummary = serviceIncidents.isEmpty()
                ? "No failures detected. Service is operating normally."
                : serviceIncidents.get(0).getDecisionReason();

            String activeFailure = serviceIncidents.isEmpty()
                ? "None"
                : serviceIncidents.stream()
                    .filter(i -> "IN_PROGRESS".equals(i.getStatus()) || "UNRESOLVED".equals(i.getStatus()))
                    .map(i -> i.getFailureType().name())
                    .findFirst().orElse("Resolved");

            long totalIncidents = serviceIncidents.size();
            long resolved = serviceIncidents.stream().filter(i -> "RECOVERED".equals(i.getStatus())).count();
            OptionalDouble avgMttr = serviceIncidents.stream()
                .filter(i -> i.getMttrMs() != null)
                .mapToLong(Incident::getMttrMs)
                .average();

            Map<String, Object> detail = new java.util.LinkedHashMap<>();
            detail.put("service", service);
            detail.put("recentMetrics", recent);
            detail.put("incidents", serviceIncidents.stream().limit(10).toList());
            detail.put("recentActions", recentActions);
            detail.put("diagnosisSummary", diagnosisSummary);
            detail.put("activeFailureType", activeFailure);
            detail.put("totalIncidents", totalIncidents);
            detail.put("resolvedIncidents", resolved);
            detail.put("avgMttrMs", avgMttr.isPresent() ? (long) avgMttr.getAsDouble() : null);
            return ResponseEntity.ok(detail);
        }).orElse(ResponseEntity.notFound().build());
    }

    // 4. METRICS FOR RECHARTS
    @GetMapping("/metrics")
    public ResponseEntity<List<ServiceMetric>> getMetrics(@RequestParam Long serviceId) {
        List<ServiceMetric> metrics = metricRepo.findByServiceIdOrderByCollectedAtDesc(serviceId);
        if (metrics.size() > 30) {
            metrics = metrics.subList(0, 30);
        }
        Collections.reverse(metrics);
        return ResponseEntity.ok(metrics);
    }

    // 5. INCIDENTS (RECOVERY TIMELINE & RECOMMENDATION PANEL)
    @GetMapping("/incidents")
    public ResponseEntity<List<Incident>> getIncidents() {
        return ResponseEntity.ok(incidentRepo.findTop20ByOrderByDetectedAtDesc());
    }

    @GetMapping("/incidents/{id}/actions")
    public ResponseEntity<List<RecoveryAction>> getIncidentActions(@PathVariable Long id) {
        return ResponseEntity.ok(actionRepo.findByIncidentIdOrderByStepNumberAsc(id));
    }

    // 6. POLICIES
    @GetMapping("/policies")
    public ResponseEntity<List<Policy>> getPolicies() {
        return ResponseEntity.ok(policyRepo.findAllByOrderByFailureTypeAscStepNumberAsc());
    }

    @PutMapping("/policies/{id}")
    public ResponseEntity<Policy> updatePolicy(@PathVariable Long id, @RequestBody Policy updated) {
        return policyRepo.findById(id).map(policy -> {
            policy.setAction(updated.getAction());
            policy.setMaxRetries(updated.getMaxRetries());
            policy.setCooldownSeconds(updated.getCooldownSeconds());
            policy.setEnabled(updated.isEnabled());
            return ResponseEntity.ok(policyRepo.save(policy));
        }).orElse(ResponseEntity.notFound().build());
    }

    // 7. SIMULATION DISPATCHER (SIMULATE CHAOS ON HOSPITAL SERVICES)
    @PostMapping("/simulate")
    public ResponseEntity<Map<String, Object>> triggerSimulation(
            @RequestParam String serviceName,
            @RequestParam String failureType,
            @RequestParam(defaultValue = "15") int durationSeconds
    ) {
        Optional<MonitoredService> optService = serviceRepo.findByName(serviceName);
        if (optService.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Service not found"));
        }

        MonitoredService service = optService.get();
        if (service.getChaosUrl() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Chaos endpoint not configured for " + serviceName));
        }

        String targetUrl = switch (failureType.toUpperCase()) {
            case "HIGH_CPU" -> service.getChaosUrl() + "/cpu?seconds=" + durationSeconds;
            case "HIGH_MEMORY" -> service.getChaosUrl() + "/memory?mb=200";
            case "DATABASE_LOST" -> service.getChaosUrl() + "/db-disconnect";
            case "SLOW_RESPONSE" -> service.getChaosUrl() + "/latency?ms=3500";
            case "HTTP_5XX_ERRORS" -> service.getChaosUrl() + "/500?enable=true";
            case "SERVICE_CRASH" -> service.getChaosUrl() + "/crash";
            default -> service.getChaosUrl() + "/cpu?seconds=10";
        };

        try {
            restTemplate.postForLocation(targetUrl, null);
            return ResponseEntity.ok(Map.of(
                    "status", "SIMULATION_TRIGGERED",
                    "targetService", serviceName,
                    "failureType", failureType
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "status", "SIMULATION_SENT_WITH_POSSIBLE_CRASH",
                    "targetService", serviceName,
                    "failureType", failureType,
                    "detail", e.getMessage()
            ));
        }
    }
}
