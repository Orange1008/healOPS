package com.healops.core.model;

import jakarta.persistence.*;

@Entity
@Table(name = "policies")
public class Policy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private FailureType failureType;

    private int stepNumber;
    private String action; // e.g. "RECONNECT_DB_POOL", "RESTART_SERVICE", "RESTART_CONTAINER", "ALERT_ADMIN"
    private int maxRetries = 3;
    private int cooldownSeconds = 60;
    private boolean enabled = true;

    public Policy() {}

    public Policy(FailureType failureType, int stepNumber, String action, int maxRetries, int cooldownSeconds) {
        this.failureType = failureType;
        this.stepNumber = stepNumber;
        this.action = action;
        this.maxRetries = maxRetries;
        this.cooldownSeconds = cooldownSeconds;
        this.enabled = true;
    }

    public Long getId() { return id; }
    public FailureType getFailureType() { return failureType; }
    public void setFailureType(FailureType failureType) { this.failureType = failureType; }

    public int getStepNumber() { return stepNumber; }
    public void setStepNumber(int stepNumber) { this.stepNumber = stepNumber; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public int getMaxRetries() { return maxRetries; }
    public void setMaxRetries(int maxRetries) { this.maxRetries = maxRetries; }

    public int getCooldownSeconds() { return cooldownSeconds; }
    public void setCooldownSeconds(int cooldownSeconds) { this.cooldownSeconds = cooldownSeconds; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}
