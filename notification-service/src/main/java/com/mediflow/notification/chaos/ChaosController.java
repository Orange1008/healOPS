package com.mediflow.notification.chaos;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

@RestController
@RequestMapping("/chaos")
public class ChaosController {

    private static final Logger log = LoggerFactory.getLogger(ChaosController.class);

    private final AtomicBoolean cpuBurnActive = new AtomicBoolean(false);
    private final List<byte[]> memoryLeakSink = Collections.synchronizedList(new ArrayList<>());
    private volatile long injectedLatencyMs = 0;
    private final AtomicBoolean return500Active = new AtomicBoolean(false);

    @Autowired(required = false)
    private DataSource dataSource;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getChaosStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("cpuBurnActive", cpuBurnActive.get());
        status.put("leakedMemoryMB", (memoryLeakSink.size() * 50));
        status.put("injectedLatencyMs", injectedLatencyMs);
        status.put("return500Active", return500Active.get());
        return ResponseEntity.ok(status);
    }

    @PostMapping("/cpu")
    public ResponseEntity<Map<String, String>> triggerCpuBurn(@RequestParam(defaultValue = "20") int seconds) {
        log.warn("🔥 [Chaos] Triggering High CPU burn for {} seconds", seconds);
        cpuBurnActive.set(true);
        Thread cpuThread = new Thread(() -> {
            long end = System.currentTimeMillis() + (seconds * 1000L);
            while (System.currentTimeMillis() < end && cpuBurnActive.get()) {
                double val = Math.sin(Math.random()) * Math.cos(Math.random());
            }
            cpuBurnActive.set(false);
            log.info("✅ [Chaos] CPU burn ended");
        });
        cpuThread.setName("chaos-cpu-burner");
        cpuThread.start();
        return ResponseEntity.ok(Map.of("message", "CPU burn triggered for " + seconds + " seconds"));
    }

    @PostMapping("/memory")
    public ResponseEntity<Map<String, Object>> triggerMemoryLeak(@RequestParam(defaultValue = "100") int mb) {
        log.warn("🔥 [Chaos] Injecting {} MB into memory leak sink", mb);
        try {
            int chunks = mb / 10;
            for (int i = 0; i < chunks; i++) {
                memoryLeakSink.add(new byte[10 * 1024 * 1024]);
            }
        } catch (OutOfMemoryError e) {
            log.error("💥 [Chaos] OOM Error hit!");
        }
        return ResponseEntity.ok(Map.of("message", "Leaked " + mb + " MB", "currentLeakMB", memoryLeakSink.size() * 10));
    }

    @PostMapping("/latency")
    public ResponseEntity<Map<String, Object>> triggerLatency(@RequestParam(defaultValue = "3500") long delayMs) {
        log.warn("🔥 [Chaos] Injecting {} ms latency into requests", delayMs);
        this.injectedLatencyMs = delayMs;
        return ResponseEntity.ok(Map.of("message", "Latency of " + delayMs + " ms activated"));
    }

    @PostMapping("/500")
    public ResponseEntity<Map<String, String>> trigger500Errors() {
        log.warn("🔥 [Chaos] Activated HTTP 500 error mode");
        return500Active.set(true);
        return ResponseEntity.ok(Map.of("message", "HTTP 500 mode active"));
    }

    @PostMapping("/db-disconnect")
    public ResponseEntity<Map<String, String>> triggerDbDisconnect() {
        log.warn("🔥 [Chaos] Simulating Database Pool Disconnect");
        try {
            if (dataSource != null) {
                try (Connection conn = dataSource.getConnection()) {
                    conn.close();
                }
            }
            return ResponseEntity.ok(Map.of("message", "Database pool eviction simulated"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/crash")
    public ResponseEntity<Map<String, String>> triggerCrash() {
        log.warn("💥 [Chaos] Crashing JVM process in 1 second!");
        new Thread(() -> {
            try {
                Thread.sleep(1000);
                System.exit(1);
            } catch (Exception ignored) {}
        }).start();
        return ResponseEntity.ok(Map.of("message", "Process crash initiated. Service terminating."));
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetChaos() {
        log.info("🛡️ [Chaos] Resetting all simulated chaos faults");
        cpuBurnActive.set(false);
        memoryLeakSink.clear();
        injectedLatencyMs = 0;
        return500Active.set(false);
        System.gc();
        return ResponseEntity.ok(Map.of("message", "All chaos faults cleared. Service healthy."));
    }
}
