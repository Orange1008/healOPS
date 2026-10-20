package com.mediflow.pharmacy.model;

import jakarta.persistence.*;

@Entity
@Table(name = "prescriptions")
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long patientId;
    private String patientName;
    private String medication;
    private String dosage;
    private String frequency;
    private String status = "PENDING"; // PENDING, DISPENSED, CANCELLED

    public Prescription() {}

    public Prescription(Long patientId, String patientName, String medication, String dosage, String frequency) {
        this.patientId = patientId;
        this.patientName = patientName;
        this.medication = medication;
        this.dosage = dosage;
        this.frequency = frequency;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getMedication() { return medication; }
    public void setMedication(String medication) { this.medication = medication; }
    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
