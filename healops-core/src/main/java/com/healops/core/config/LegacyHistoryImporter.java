package com.healops.core.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healops.core.model.*;
import com.healops.core.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** One-time migration of records exported from the previous in-memory HealOps database. */
@Component
@Order(1)
public class LegacyHistoryImporter implements CommandLineRunner {
    private static final Path ARCHIVE = Path.of("/data/legacy-history.json");
    private final ObjectMapper mapper;
    private final MonitoredServiceRepository services;
    private final IncidentRepository incidents;
    private final RecoveryActionRepository actions;
    private final PolicyRepository policies;
    private final ServiceMetricRepository metrics;

    public LegacyHistoryImporter(ObjectMapper mapper, MonitoredServiceRepository services,
            IncidentRepository incidents, RecoveryActionRepository actions,
            PolicyRepository policies, ServiceMetricRepository metrics) {
        this.mapper = mapper;
        this.services = services;
        this.incidents = incidents;
        this.actions = actions;
        this.policies = policies;
        this.metrics = metrics;
    }

    @Override
    public void run(String... args) throws Exception {
        Path marker = ARCHIVE.resolveSibling("legacy-history.imported");
        if (!Files.exists(ARCHIVE) || Files.exists(marker)) return;
        JsonNode root = mapper.readTree(ARCHIVE.toFile());
        Map<String, MonitoredService> serviceMap = new HashMap<>();
        for (JsonNode item : flatten(root.path("services"))) {
            String name = text(item, "name", null);
            if (name == null || name.isBlank()) continue;
            MonitoredService service = services.findByName(name).orElseGet(MonitoredService::new);
            service.setName(name);
            service.setCategory(enumValue(ServiceCategory.class, text(item, "category", "INTERNAL_MICROSERVICE"), ServiceCategory.INTERNAL_MICROSERVICE));
            service.setHealthUrl(text(item, "healthUrl", ""));
            service.setMetricsUrl(text(item, "metricsUrl", null));
            service.setChaosUrl(text(item, "chaosUrl", null));
            service.setContainerName(text(item, "containerName", null));
            service.setPort(item.path("port").asInt());
            service.setDependencies(text(item, "dependencies", ""));
            service.setSupportedRemedies(text(item, "supportedRemedies", ""));
            String faults = text(item, "supportedFaults", null);
            if (faults != null) service.setSupportedFaults(faults);
            else if ("patient-service".equals(name) || "clinical-service".equals(name))
                service.setSupportedFaults("HIGH_CPU,HIGH_MEMORY,DATABASE_LOST,SLOW_RESPONSE,HTTP_5XX_ERRORS,SERVICE_CRASH");
            else if ("auth-service".equals(name) || "api-gateway".equals(name)) service.setSupportedFaults("");
            service.setEnabled(item.path("enabled").asBoolean(true));
            service.setCurrentStatus(enumValue(ServiceStatus.class, text(item, "currentStatus", "HEALTHY"), ServiceStatus.HEALTHY));
            service.setHealthScore(item.path("healthScore").asInt(100));
            serviceMap.put(name, services.save(service));
        }

        Map<Long, Incident> incidentMap = new HashMap<>();
        for (JsonNode item : flatten(root.path("incidents"))) {
            String serviceName = item.path("service").path("name").asText("");
            MonitoredService service = serviceMap.get(serviceName);
            if (service == null) continue;
            FailureType failure = enumValue(FailureType.class, text(item, "failureType", "SERVICE_CRASH"), FailureType.SERVICE_CRASH);
            Incident incident = new Incident(service, failure, text(item, "severity", "WARNING"),
                    text(item, "issueDescription", ""), text(item, "recommendedAction", ""),
                    text(item, "decisionReason", ""), nullableLong(item, "estimatedMttrMs"));
            incident.setStatus(text(item, "status", "UNRESOLVED"));
            incident.setDetectedAt(date(item, "detectedAt"));
            incident.setResolvedAt(date(item, "resolvedAt"));
            incident.setMttdMs(nullableLong(item, "mttdMs"));
            incident.setMttrMs(nullableLong(item, "mttrMs"));
            incident = incidents.save(incident);
            if (item.hasNonNull("id")) incidentMap.put(item.path("id").asLong(), incident);
        }

        for (JsonNode item : flatten(root.path("actions"))) {
            Incident incident = incidentMap.get(item.path("incident").path("id").asLong(-1));
            if (incident == null) continue;
            RecoveryAction action = new RecoveryAction(incident, item.path("stepNumber").asInt(), text(item, "actionName", ""));
            action.setExecutionLog(text(item, "executionLog", null));
            action.setResult(text(item, "result", null));
            action.setStartedAt(date(item, "startedAt"));
            action.setEndedAt(date(item, "endedAt"));
            actions.save(action);
        }

        for (JsonNode item : flatten(root.path("policies"))) {
            FailureType type = enumValue(FailureType.class, text(item, "failureType", "HIGH_CPU"), FailureType.HIGH_CPU);
            int step = item.path("stepNumber").asInt(1);
            Policy policy = policies.findAllByOrderByFailureTypeAscStepNumberAsc().stream()
                    .filter(existing -> existing.getFailureType() == type && existing.getStepNumber() == step)
                    .findFirst().orElseGet(Policy::new);
            policy.setFailureType(type);
            policy.setStepNumber(step);
            policy.setAction(text(item, "action", "ALERT_ADMIN"));
            policy.setMaxRetries(item.path("maxRetries").asInt(3));
            policy.setCooldownSeconds(item.path("cooldownSeconds").asInt(60));
            policy.setEnabled(item.path("enabled").asBoolean(true));
            policies.save(policy);
        }

        for (JsonNode item : flatten(root.path("metrics"))) {
            String serviceName = item.path("service").path("name").asText("");
            MonitoredService service = serviceMap.get(serviceName);
            if (service == null) continue;
            ServiceMetric metric = new ServiceMetric(service, item.path("cpuPercent").asDouble(),
                    item.path("memoryMb").asDouble(), item.path("responseTimeMs").asLong(),
                    item.path("errorRatePercent").asDouble(), item.path("dbUp").asBoolean(true),
                    text(item, "containerStatus", "RUNNING"));
            metric.setCollectedAt(date(item, "collectedAt"));
            metrics.save(metric);
        }
        Files.move(ARCHIVE, marker);
    }

    private static String text(JsonNode node, String key, String fallback) {
        JsonNode value = node.get(key);
        return value == null || value.isNull() ? fallback : value.asText();
    }
    private static List<JsonNode> flatten(JsonNode node) {
        List<JsonNode> values = new ArrayList<>();
        if (node == null || node.isNull()) return values;
        if (node.isArray()) node.forEach(child -> values.addAll(flatten(child)));
        else values.add(node);
        return values;
    }
    private static Long nullableLong(JsonNode node, String key) {
        JsonNode value = node.get(key);
        return value == null || value.isNull() ? null : value.asLong();
    }
    private static LocalDateTime date(JsonNode node, String key) {
        String value = text(node, key, null);
        return value == null || value.isBlank() ? null : LocalDateTime.parse(value);
    }
    private static <E extends Enum<E>> E enumValue(Class<E> type, String value, E fallback) {
        try { return Enum.valueOf(type, value); } catch (RuntimeException ignored) { return fallback; }
    }
}
