package com.healops.core.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "service_id", nullable = false)
    private MonitoredService service;

    @Enumerated(EnumType.STRING)
    private FailureType failureType;

    private String severity; // WARNING or CRITICAL
    private String status;   // PENDING_APPROVAL, IN_PROGRESS, RECOVERED, UNRESOLVED

    // Explainable Recommendation Fields
    private String issueDescription;
    private String recommendedAction;
    @Column(length = 1024)
    private String decisionReason;
    private Long estimatedMttrMs;

    private LocalDateTime detectedAt = LocalDateTime.now();
    private LocalDateTime resolvedAt;

    private Long mttdMs; // Mean Time to Detect
    private Long mttrMs; // Mean Time to Recover

    public Incident() {}

    public Incident(MonitoredService service, FailureType failureType, String severity, String issueDescription, String recommendedAction, String decisionReason, Long estimatedMttrMs) {
        this.service = service;
        this.failureType = failureType;
        this.severity = severity;
        this.issueDescription = issueDescription;
        this.recommendedAction = recommendedAction;
        this.decisionReason = decisionReason;
        this.estimatedMttrMs = estimatedMttrMs;
        this.status = "IN_PROGRESS";
        this.detectedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public MonitoredService getService() { return service; }
    public void setService(MonitoredService service) { this.service = service; }

    public FailureType getFailureType() { return failureType; }
    public void setFailureType(FailureType failureType) { this.failureType = failureType; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getIssueDescription() { return issueDescription; }
    public void setIssueDescription(String issueDescription) { this.issueDescription = issueDescription; }

    public String getRecommendedAction() { return recommendedAction; }
    public void setRecommendedAction(String recommendedAction) { this.recommendedAction = recommendedAction; }

    public String getDecisionReason() { return decisionReason; }
    public void setDecisionReason(String decisionReason) { this.decisionReason = decisionReason; }

    public Long getEstimatedMttrMs() { return estimatedMttrMs; }
    public void setEstimatedMttrMs(Long estimatedMttrMs) { this.estimatedMttrMs = estimatedMttrMs; }

    public LocalDateTime getDetectedAt() { return detectedAt; }
    public void setDetectedAt(LocalDateTime detectedAt) { this.detectedAt = detectedAt; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public Long getMttdMs() { return mttdMs; }
    public void setMttdMs(Long mttdMs) { this.mttdMs = mttdMs; }

    public Long getMttrMs() { return mttrMs; }
    public void setMttrMs(Long mttrMs) { this.mttrMs = mttrMs; }
}
