package com.mediflow.laboratory.controller;

import com.mediflow.laboratory.model.LabReport;
import com.mediflow.laboratory.repository.LabReportRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/laboratory")
@CrossOrigin(origins = "*")
public class LaboratoryController {

    private final LabReportRepository labRepo;

    public LaboratoryController(LabReportRepository labRepo) {
        this.labRepo = labRepo;
    }

    @GetMapping
    public List<LabReport> getAllReports() {
        return labRepo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<LabReport> getReportById(@PathVariable Long id) {
        return labRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/patient/{patientId}")
    public List<LabReport> getReportsByPatient(@PathVariable Long patientId) {
        return labRepo.findByPatientId(patientId);
    }

    @PostMapping
    public LabReport createReport(@RequestBody LabReport report) {
        return labRepo.save(report);
    }

    @PutMapping("/{id}/result")
    public ResponseEntity<LabReport> updateResult(@PathVariable Long id, @RequestParam String result, @RequestParam String status) {
        return labRepo.findById(id).map(r -> {
            r.setResultSummary(result);
            r.setStatus(status);
            return ResponseEntity.ok(labRepo.save(r));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReport(@PathVariable Long id) {
        labRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
