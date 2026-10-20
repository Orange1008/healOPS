package com.healops.core.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "monitored_services")
public class MonitoredService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceCategory category = ServiceCategory.INTERNAL_MICROSERVICE;

    @Column(nullable = false)
    private String healthUrl;

    private String metricsUrl;
    private String chaosUrl;
    private String containerName;
    private int port;

    // Comma-separated dependencies e.g. "billing-service,auth-service"
    private String dependencies;

    // Supported recovery actions e.g. "CLEAR_CHAOS,RECONNECT_DB_POOL,RESTART_CONTAINER"
    private String supportedRemedies;

    // Faults that the target service actually exposes through its chaos API.
    private String supportedFaults;

    @Enumerated(EnumType.STRING)
    private ServiceStatus currentStatus = ServiceStatus.HEALTHY;

    private int healthScore = 100;

    private boolean enabled = true;

    private LocalDateTime lastPolledAt;

    @Transient
    private Long lastResponseTimeMs;

    public MonitoredService() {}

    public MonitoredService(String name, ServiceCategory category, String healthUrl, String metricsUrl, String chaosUrl, String containerName, int port, String dependencies, String supportedRemedies) {
        this.name = name;
        this.category = category;
        this.healthUrl = healthUrl;
        this.metricsUrl = metricsUrl;
        this.chaosUrl = chaosUrl;
        this.containerName = containerName;
        this.port = port;
        this.dependencies = dependencies;
        this.supportedRemedies = supportedRemedies;
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public ServiceCategory getCategory() { return category; }
    public void setCategory(ServiceCategory category) { this.category = category; }

    public String getHealthUrl() { return healthUrl; }
    public void setHealthUrl(String healthUrl) { this.healthUrl = healthUrl; }

    public String getMetricsUrl() { return metricsUrl; }
    public void setMetricsUrl(String metricsUrl) { this.metricsUrl = metricsUrl; }

    public String getChaosUrl() { return chaosUrl; }
    public void setChaosUrl(String chaosUrl) { this.chaosUrl = chaosUrl; }

    public String getContainerName() { return containerName; }
    public void setContainerName(String containerName) { this.containerName = containerName; }

    public int getPort() { return port; }
    public void setPort(int port) { this.port = port; }

    public String getDependencies() { return dependencies; }
    public void setDependencies(String dependencies) { this.dependencies = dependencies; }

    public String getSupportedRemedies() { return supportedRemedies; }
    public void setSupportedRemedies(String supportedRemedies) { this.supportedRemedies = supportedRemedies; }

    public String getSupportedFaults() { return supportedFaults; }
    public void setSupportedFaults(String supportedFaults) { this.supportedFaults = supportedFaults; }

    public ServiceStatus getCurrentStatus() { return currentStatus; }
    public void setCurrentStatus(ServiceStatus currentStatus) { this.currentStatus = currentStatus; }

    public int getHealthScore() { return healthScore; }
    public void setHealthScore(int healthScore) { this.healthScore = healthScore; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public LocalDateTime getLastPolledAt() { return lastPolledAt; }
    public void setLastPolledAt(LocalDateTime lastPolledAt) { this.lastPolledAt = lastPolledAt; }
    public Long getLastResponseTimeMs() { return lastResponseTimeMs; }
    public void setLastResponseTimeMs(Long lastResponseTimeMs) { this.lastResponseTimeMs = lastResponseTimeMs; }
}
