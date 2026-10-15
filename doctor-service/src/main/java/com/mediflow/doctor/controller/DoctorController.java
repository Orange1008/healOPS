package com.mediflow.doctor.controller;

import com.mediflow.doctor.model.Doctor;
import com.mediflow.doctor.repository.DoctorRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@CrossOrigin(origins = "*")
public class DoctorController {

    private final DoctorRepository doctorRepo;

    public DoctorController(DoctorRepository doctorRepo) {
        this.doctorRepo = doctorRepo;
    }

    @GetMapping
    public List<Doctor> getAllDoctors() {
        return doctorRepo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Doctor> getDoctorById(@PathVariable Long id) {
        return doctorRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Doctor createDoctor(@RequestBody Doctor doctor) {
        return doctorRepo.save(doctor);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Doctor> updateDoctor(@PathVariable Long id, @RequestBody Doctor details) {
        return doctorRepo.findById(id).map(doc -> {
            doc.setName(details.getName());
            doc.setSpecialty(details.getSpecialty());
            doc.setDepartment(details.getDepartment());
            doc.setEmail(details.getEmail());
            doc.setPhone(details.getPhone());
            doc.setAvailable(details.isAvailable());
            return ResponseEntity.ok(doctorRepo.save(doc));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDoctor(@PathVariable Long id) {
        doctorRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
