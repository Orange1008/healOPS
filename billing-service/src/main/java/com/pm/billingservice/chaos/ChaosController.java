package com.pm.billingservice.chaos;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<Map<String, String>> triggerCpuBurn(@RequestParam(defaultValue = "15") int seconds) {
        log.warn("🔥 [Chaos] Triggering High CPU burn on Billing Service for {} seconds", seconds);
        cpuBurnActive.set(true);
        Thread cpuThread = new Thread(() -> {
            long end = System.currentTimeMillis() + (seconds * 1000L);
            while (System.currentTimeMillis() < end && cpuBurnActive.get()) {
                double val = Math.sin(Math.random()) * Math.cos(Math.random());
            }
            cpuBurnActive.set(false);
            log.info("✅ [Chaos] Billing CPU burn ended");
        });
        cpuThread.setName("chaos-cpu-burner-billing");
        cpuThread.start();

        return ResponseEntity.ok(Map.of("message", "CPU burn triggered for " + seconds + " seconds"));
    }

    @PostMapping("/memory")
    public ResponseEntity<Map<String, Object>> triggerMemoryLeak(@RequestParam(defaultValue = "100") int mb) {
        log.warn("🔥 [Chaos] Injecting {} MB memory into Billing Service", mb);
        for (int i = 0; i < mb / 10; i++) {
            memoryLeakSink.add(new byte[10 * 1024 * 1024]);
        }
        return ResponseEntity.ok(Map.of(
            "message", "Allocated " + mb + " MB",
            "totalAllocatedMB", memoryLeakSink.size() * 10
        ));
    }

    @PostMapping("/latency")
    public ResponseEntity<Map<String, String>> setLatency(@RequestParam(defaultValue = "3500") long ms) {
        log.warn("🔥 [Chaos] Injected latency into Billing Service: {} ms", ms);
        this.injectedLatencyMs = ms;
        return ResponseEntity.ok(Map.of("message", "Latency set to " + ms + " ms"));
    }

    @PostMapping("/500")
    public ResponseEntity<Map<String, String>> toggle500(@RequestParam(defaultValue = "true") boolean enable) {
        log.warn("🔥 [Chaos] Billing Service HTTP 500 error mode: {}", enable);
        this.return500Active.set(enable);
        return ResponseEntity.ok(Map.of("message", "HTTP 500 mode: " + enable));
    }

    @PostMapping("/crash")
    public void crashService() {
        log.error("💥 [Chaos] CRASHING BILLING SERVICE JVM PROCESS NOW!");
        new Thread(() -> {
            try {
                Thread.sleep(500);
            } catch (InterruptedException ignored) {}
            System.exit(1);
        }).start();
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetChaos() {
        log.info("🛡️ [Chaos] Resetting all billing chaos state");
        cpuBurnActive.set(false);
        memoryLeakSink.clear();
        System.gc();
        injectedLatencyMs = 0;
        return500Active.set(false);
        return ResponseEntity.ok(Map.of("message", "All chaos faults cleared"));
    }
}
