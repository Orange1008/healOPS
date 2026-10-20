package com.mediflow.pharmacy.controller;

import com.mediflow.pharmacy.model.Prescription;
import com.mediflow.pharmacy.repository.PrescriptionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pharmacy")
@CrossOrigin(origins = "*")
public class PharmacyController {

    private final PrescriptionRepository prescriptionRepo;

    public PharmacyController(PrescriptionRepository prescriptionRepo) {
        this.prescriptionRepo = prescriptionRepo;
    }

    @GetMapping
    public List<Prescription> getAllPrescriptions() {
        return prescriptionRepo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Prescription> getPrescriptionById(@PathVariable Long id) {
        return prescriptionRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/patient/{patientId}")
    public List<Prescription> getPrescriptionsByPatient(@PathVariable Long patientId) {
        return prescriptionRepo.findByPatientId(patientId);
    }

    @PostMapping
    public Prescription createPrescription(@RequestBody Prescription prescription) {
        return prescriptionRepo.save(prescription);
    }

    @PutMapping("/{id}/dispense")
    public ResponseEntity<Prescription> dispensePrescription(@PathVariable Long id) {
        return prescriptionRepo.findById(id).map(p -> {
            p.setStatus("DISPENSED");
            return ResponseEntity.ok(prescriptionRepo.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePrescription(@PathVariable Long id) {
        prescriptionRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
