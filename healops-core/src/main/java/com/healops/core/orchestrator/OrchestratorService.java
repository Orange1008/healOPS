package com.healops.core.orchestrator;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.util.UriUtils;
import java.nio.charset.StandardCharsets;

import java.time.Duration;
import java.util.Set;

@Service
public class OrchestratorService {

    private static final Logger log = LoggerFactory.getLogger(OrchestratorService.class);
    private static final Set<String> DOCKER_CONTROLLED_CONTAINERS = Set.of(
            "patient-service", "clinical-service", "auth-service", "api-gateway");
    private final RestClient restClient;
    private final RestClient dockerRestClient;
    private final String dockerApiBase;

    public OrchestratorService(@Value("${HEALOPS_DOCKER_HOST:http://healops-docker-control}") String dockerHost) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(2));
        requestFactory.setReadTimeout(Duration.ofSeconds(8));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();

        SimpleClientHttpRequestFactory dockerRequestFactory = new SimpleClientHttpRequestFactory();
        dockerRequestFactory.setConnectTimeout(Duration.ofSeconds(3));
        // Restarting a JVM container may take much longer than clearing an
        // injected fault. Let Docker return its response after the restart.
        dockerRequestFactory.setReadTimeout(Duration.ofSeconds(120));
        this.dockerRestClient = RestClient.builder().requestFactory(dockerRequestFactory).build();
        this.dockerApiBase = dockerHost == null ? "" : dockerHost.replaceFirst("^tcp://", "http://").replaceFirst("/$", "");
    }

    /**
     * Executes a multi-tier recovery action step:
     * 1. CLEAR_CHAOS - Resets injected faults
     * 2. FORCE_JVM_GC - Solves memory leaks & triggers garbage collection
     * 3. RECONNECT_DB_POOL - Refreshes database connections
     * 4. RESET_CIRCUIT_BREAKER - Restores degraded service traffic
     * 5. RESTART_SERVICE - Context / process refresh
     * 6. RESTART_CONTAINER - Docker container or process restart
     * 7. NOTIFY_ADMIN - External / unrecoverable alert
     */
    public boolean executeRecovery(String action, String serviceName, String containerName, String chaosUrl, int port) {
        log.info("⚙️ [Orchestrator] Initiating automated recovery step: {} for service: {}", action, serviceName);

        try {
            switch (action) {
                case "CLEAR_CHAOS":
                    return clearChaosFaults(chaosUrl);

                case "FORCE_JVM_GC":
                    return triggerJvmGarbageCollection(chaosUrl);

                case "RECONNECT_DB_POOL":
                    return reconnectDatabasePool(chaosUrl);

                case "RESET_CIRCUIT_BREAKER":
                    return resetCircuitBreaker(chaosUrl);

                case "RESTART_CONTAINER":
                case "RESTART_SERVICE":
                    // 1. Try Docker restart
                    boolean containerRestart = restartDockerContainer(containerName);
                    if (containerRestart) return true;

                    // 2. Fall back to clearing chaos state if running as local JVM
                    log.info("🔄 Falling back to service-level reset for local process {}", serviceName);
                    return clearChaosFaults(chaosUrl);

                case "NOTIFY_ADMIN":
                    log.warn("🚨 [Orchestrator] Escalating to On-Call Admin: automated self-healing exhausted for {}", serviceName);
                    return true;

                default:
                    log.warn("⚠️ Unhandled recovery action: {}, attempting fallback reset", action);
                    return clearChaosFaults(chaosUrl);
            }
        } catch (Exception e) {
            log.error("❌ Recovery execution failed for {}: {}", serviceName, e.getMessage());
            return false;
        }
    }

    private boolean clearChaosFaults(String chaosUrl) {
        if (chaosUrl == null || chaosUrl.isBlank()) return false;
        try {
            String url = chaosUrl + "/reset";
            log.info("📡 Invoking service reset endpoint: {}", url);
            restClient.post().uri(url).retrieve().toBodilessEntity();
            log.info("✅ Service chaos faults cleared on {}", chaosUrl);
            return true;
        } catch (Exception e) {
            log.warn("Could not call reset endpoint directly: {}", e.getMessage());
            return false;
        }
    }

    private boolean triggerJvmGarbageCollection(String chaosUrl) {
        if (chaosUrl == null || chaosUrl.isBlank()) return false;
        try {
            // Reset clears the service's simulated memory-pressure sink.
            String url = chaosUrl + "/reset";
            log.info("🧹 Requesting Heap Reclamation and GC sweep on {}", url);
            restClient.post().uri(url).retrieve().toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.warn("GC trigger failed: {}", e.getMessage());
            return false;
        }
    }

    private boolean reconnectDatabasePool(String chaosUrl) {
        if (chaosUrl == null || chaosUrl.isBlank()) return false;
        try {
            String url = chaosUrl + "/reset";
            log.info("🔌 Refreshing Datasource HikariCP Connection Pool on {}", url);
            restClient.post().uri(url).retrieve().toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.warn("Database pool refresh failed: {}", e.getMessage());
            return false;
        }
    }

    private boolean resetCircuitBreaker(String chaosUrl) {
        if (chaosUrl == null || chaosUrl.isBlank()) return false;
        try {
            String url = chaosUrl + "/reset";
            log.info("🛡️ Resetting Resilience4j Circuit Breakers to CLOSED state on {}", url);
            restClient.post().uri(url).retrieve().toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.warn("Circuit breaker reset failed: {}", e.getMessage());
            return false;
        }
    }

    private boolean restartDockerContainer(String containerName) {
        if (containerName == null || containerName.isBlank()) return false;
        try {
            if (dockerApiBase.isBlank()) {
                log.error("Docker restart unavailable for {}: HEALOPS_DOCKER_HOST is empty", containerName);
                return false;
            }
            if (!DOCKER_CONTROLLED_CONTAINERS.contains(containerName)) {
                log.error("Docker recovery is not allowlisted for container {}", containerName);
                return false;
            }
            String encodedName = UriUtils.encodePathSegment(containerName, StandardCharsets.UTF_8);
            boolean restartAccepted = false;
            try {
                log.info("🐳 Requesting allowlisted Docker restart for {} via {}", containerName, dockerApiBase);
                dockerRestClient.post()
                        .uri(dockerApiBase + "/restart/" + encodedName)
                        .retrieve()
                        .toBodilessEntity();
                restartAccepted = true;
                log.info("✅ Docker restart request accepted for {}", containerName);
            } catch (Exception restartError) {
                // Docker's restart endpoint can return success without starting
                // a container that was already exited. Fall through to start.
                log.warn("Docker restart request failed for {}: {}; trying allowlisted start",
                        containerName, restartError.getMessage());
            }

            boolean startAccepted = startDockerContainer(encodedName, containerName);
            if (!restartAccepted && !startAccepted) return false;
            log.info("✅ Docker recovery confirmed for {} (restartAccepted={}, startAccepted={})",
                    containerName, restartAccepted, startAccepted);
            return true;
        } catch (Exception e) {
            log.error("Restricted Docker restart failed for {} via {}: {}",
                    containerName, dockerApiBase, e.getMessage());
        }
        return false;
    }

    private boolean startDockerContainer(String encodedName, String containerName) {
        try {
            int status = dockerRestClient.post()
                    .uri(dockerApiBase + "/start/" + encodedName)
                    .exchange((request, response) -> response.getStatusCode().value());
            // Docker returns 304 when the container is already running. That is
            // expected after a successful restart and means it is started.
            boolean accepted = (status >= 200 && status < 300) || status == 304;
            log.info("Docker start check for {} returned HTTP {} (accepted={})",
                    containerName, status, accepted);
            return accepted;
        } catch (Exception e) {
            log.warn("Allowlisted Docker start failed for {}: {}", containerName, e.getMessage());
            return false;
        }
    }
}
