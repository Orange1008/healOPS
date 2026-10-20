package com.pm.patientservice.chaos;

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

    // 1. HIGH CPU SIMULATION
    @PostMapping("/cpu")
    public ResponseEntity<Map<String, String>> triggerCpuBurn(@RequestParam(defaultValue = "15") int seconds) {
        log.warn("🔥 [Chaos] Triggering High CPU burn for {} seconds", seconds);
        cpuBurnActive.set(true);
        Thread cpuThread = new Thread(() -> {
            long end = System.currentTimeMillis() + (seconds * 1000L);
            while (System.currentTimeMillis() < end && cpuBurnActive.get()) {
                // High CPU arithmetic busy loop
                double val = Math.sin(Math.random()) * Math.cos(Math.random());
            }
            cpuBurnActive.set(false);
            log.info("✅ [Chaos] CPU burn ended");
        });
        cpuThread.setName("chaos-cpu-burner");
        cpuThread.start();

        return ResponseEntity.ok(Map.of("message", "CPU burn triggered for " + seconds + " seconds"));
    }

    // 2. MEMORY LEAK SIMULATION
    @PostMapping("/memory")
    public ResponseEntity<Map<String, Object>> triggerMemoryLeak(@RequestParam(defaultValue = "100") int mb) {
        log.warn("🔥 [Chaos] Injecting {} MB into memory leak sink", mb);
        int safeAmount = Math.max(0, Math.min(mb, 512));
        simulatedMemoryMB.set(safeAmount);
        return ResponseEntity.ok(Map.of(
            "message", "Simulated " + safeAmount + " MB of memory pressure",
            "totalAllocatedMB", safeAmount
        ));
    }

    // 3. DATABASE DISCONNECT / POOL EXHAUSTION
    @PostMapping("/db-disconnect")
    public ResponseEntity<Map<String, String>> triggerDbDisconnect() {
        log.warn("🔥 [Chaos] Simulating database disconnect for patient requests");
        databaseLostActive.set(true);
        return ResponseEntity.ok(Map.of("message", "Patient database access is now simulated as unavailable"));
    }

    // 4. SLOW RESPONSE / LATENCY
    @PostMapping("/latency")
    public ResponseEntity<Map<String, String>> setLatency(@RequestParam(defaultValue = "3500") long ms) {
        log.warn("🔥 [Chaos] Injected artificial latency: {} ms", ms);
        this.injectedLatencyMs = ms;
        return ResponseEntity.ok(Map.of("message", "Latency set to " + ms + " ms"));
    }

    // 5. HTTP 500 ERRORS
    @PostMapping("/500")
    public ResponseEntity<Map<String, String>> toggle500(@RequestParam(defaultValue = "true") boolean enable) {
        log.warn("🔥 [Chaos] HTTP 500 error mode set to: {}", enable);
        this.return500Active.set(enable);
        return ResponseEntity.ok(Map.of("message", "HTTP 500 mode: " + enable));
    }

    // Interceptor check for Latency & 500s
    @GetMapping("/test-endpoint")
    public ResponseEntity<String> testEndpoint() throws InterruptedException {
        if (injectedLatencyMs > 0) {
            Thread.sleep(injectedLatencyMs);
        }
        if (return500Active.get()) {
            throw new RuntimeException("Chaos Injected 500 Internal Server Error");
        }
        return ResponseEntity.ok("Service is running normally");
    }

    // 6. PROCESS CRASH
    @PostMapping("/crash")
    public void crashService() {
        log.error("💥 [Chaos] Simulating patient service outage; HealOps reset can restore it");
        serviceCrashActive.set(true);
    }

    // RECOVERY / CLEAR CHAOS
    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetChaos() {
        log.info("🛡️ [Chaos] Resetting all chaos state");
        cpuBurnActive.set(false);
        simulatedMemoryMB.set(0);
        injectedLatencyMs = 0;
        return500Active.set(false);
        databaseLostActive.set(false);
        serviceCrashActive.set(false);
        return ResponseEntity.ok(Map.of("message", "All chaos faults cleared"));
    }

    public boolean isReturn500Active() { return return500Active.get(); }
    public boolean isDatabaseLostActive() { return databaseLostActive.get(); }
    public boolean isServiceCrashActive() { return serviceCrashActive.get(); }
    public boolean isCpuBurnActive() { return cpuBurnActive.get(); }
    public boolean isMemoryPressureActive() { return simulatedMemoryMB.get() > 0; }
    public long getInjectedLatencyMs() { return injectedLatencyMs; }
}
