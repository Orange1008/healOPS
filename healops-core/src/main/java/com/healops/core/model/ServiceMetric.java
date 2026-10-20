package com.healops.core.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_metrics")
public class ServiceMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "service_id", nullable = false)
    private MonitoredService service;

    private Double cpuPercent;
    private Double memoryMb;
    private long responseTimeMs;
    private double errorRatePercent;
    private boolean dbUp = true;
    private String containerStatus = "RUNNING";

    private LocalDateTime collectedAt = LocalDateTime.now();

    public ServiceMetric() {}

    public ServiceMetric(MonitoredService service, Double cpuPercent, Double memoryMb, long responseTimeMs, double errorRatePercent, boolean dbUp, String containerStatus) {
        this.service = service;
        this.cpuPercent = cpuPercent;
        this.memoryMb = memoryMb;
        this.responseTimeMs = responseTimeMs;
        this.errorRatePercent = errorRatePercent;
        this.dbUp = dbUp;
        this.containerStatus = containerStatus;
        this.collectedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public MonitoredService getService() { return service; }
    public void setService(MonitoredService service) { this.service = service; }

    public Double getCpuPercent() { return cpuPercent; }
    public void setCpuPercent(Double cpuPercent) { this.cpuPercent = cpuPercent; }

    public Double getMemoryMb() { return memoryMb; }
    public void setMemoryMb(Double memoryMb) { this.memoryMb = memoryMb; }

    public long getResponseTimeMs() { return responseTimeMs; }
    public void setResponseTimeMs(long responseTimeMs) { this.responseTimeMs = responseTimeMs; }

    public double getErrorRatePercent() { return errorRatePercent; }
    public void setErrorRatePercent(double errorRatePercent) { this.errorRatePercent = errorRatePercent; }

    public boolean isDbUp() { return dbUp; }
    public void setDbUp(boolean dbUp) { this.dbUp = dbUp; }

    public String getContainerStatus() { return containerStatus; }
    public void setContainerStatus(String containerStatus) { this.containerStatus = containerStatus; }

    public LocalDateTime getCollectedAt() { return collectedAt; }
    public void setCollectedAt(LocalDateTime collectedAt) { this.collectedAt = collectedAt; }
}
