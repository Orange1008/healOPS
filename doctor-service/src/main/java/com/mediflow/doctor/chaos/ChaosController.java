package com.mediflow.doctor.chaos;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping("/chaos")
public class ChaosController {

    private static final Logger log = LoggerFactory.getLogger(ChaosController.class);

    private final AtomicBoolean cpuBurnActive = new AtomicBoolean(false);
    private final AtomicInteger simulatedMemoryMB = new AtomicInteger();
    private volatile long injectedLatencyMs = 0;
    private final AtomicBoolean return500Active = new AtomicBoolean(false);
    private final AtomicBoolean databaseLostActive = new AtomicBoolean(false);
    private final AtomicBoolean serviceCrashActive = new AtomicBoolean(false);

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getChaosStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("cpuBurnActive", cpuBurnActive.get());
        status.put("leakedMemoryMB", simulatedMemoryMB.get());
        status.put("injectedLatencyMs", injectedLatencyMs);
        status.put("return500Active", return500Active.get());
        status.put("databaseLostActive", databaseLostActive.get());
        status.put("serviceCrashActive", serviceCrashActive.get());
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
        int safeAmount = Math.max(0, Math.min(mb, 512));
        simulatedMemoryMB.set(safeAmount);
        return ResponseEntity.ok(Map.of("message", "Simulated " + safeAmount + " MB of memory pressure", "currentLeakMB", safeAmount));
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
        databaseLostActive.set(true);
        return ResponseEntity.ok(Map.of("message", "Doctor database access is now simulated as unavailable"));
    }

    @PostMapping("/crash")
    public ResponseEntity<Map<String, String>> triggerCrash() {
        log.warn("💥 [Chaos] Simulating doctor service outage; HealOps reset can restore it");
        serviceCrashActive.set(true);
        return ResponseEntity.ok(Map.of("message", "Doctor service outage simulation enabled"));
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetChaos() {
        log.info("🛡️ [Chaos] Resetting all simulated chaos faults");
        cpuBurnActive.set(false);
        simulatedMemoryMB.set(0);
        injectedLatencyMs = 0;
        return500Active.set(false);
        databaseLostActive.set(false);
        serviceCrashActive.set(false);
        return ResponseEntity.ok(Map.of("message", "All chaos faults cleared. Service healthy."));
    }

    public boolean isCpuBurnActive() { return cpuBurnActive.get(); }
    public boolean isMemoryPressureActive() { return simulatedMemoryMB.get() > 0; }
    public boolean isDatabaseLostActive() { return databaseLostActive.get(); }
    public boolean isServiceCrashActive() { return serviceCrashActive.get(); }
    public boolean isReturn500Active() { return return500Active.get(); }
    public long getInjectedLatencyMs() { return injectedLatencyMs; }
}
