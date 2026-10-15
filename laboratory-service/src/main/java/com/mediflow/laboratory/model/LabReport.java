package com.mediflow.laboratory.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lab_reports")
public class LabReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long patientId;
    private String patientName;
    private String testName; // Complete Blood Count, Lipid Profile, Renal Function, HbA1c
    private String resultSummary;
    private String status = "PROCESSING"; // PROCESSING, COMPLETED, CRITICAL_ALERT
    private LocalDateTime sampleCollectedAt;

    public LabReport() {}

    public LabReport(Long patientId, String patientName, String testName, String resultSummary, String status) {
        this.patientId = patientId;
        this.patientName = patientName;
        this.testName = testName;
        this.resultSummary = resultSummary;
        this.status = status;
        this.sampleCollectedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getTestName() { return testName; }
    public void setTestName(String testName) { this.testName = testName; }
    public String getResultSummary() { return resultSummary; }
    public void setResultSummary(String resultSummary) { this.resultSummary = resultSummary; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getSampleCollectedAt() { return sampleCollectedAt; }
    public void setSampleCollectedAt(LocalDateTime sampleCollectedAt) { this.sampleCollectedAt = sampleCollectedAt; }
}
