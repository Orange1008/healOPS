package com.healops.core.orchestrator;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class OrchestratorService {

    private static final Logger log = LoggerFactory.getLogger(OrchestratorService.class);
    private final RestClient restClient = RestClient.create();

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
            // Invokes reset which clears memory sinks and calls System.gc()
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
            log.info("🐳 Executing Docker restart command for: {}", containerName);
            Process process = Runtime.getRuntime().exec(new String[]{"docker", "restart", containerName});
            int exitCode = process.waitFor();
            if (exitCode == 0) {
                log.info("✅ Docker container {} restarted successfully", containerName);
                return true;
            }
        } catch (Exception ignored) {}
        return false;
    }
}
