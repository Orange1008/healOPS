package com.mediflow.pharmacy.config;

import com.mediflow.pharmacy.model.Prescription;
import com.mediflow.pharmacy.repository.PrescriptionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class PharmacyDataInitializer {

    @Bean
    CommandLineRunner initPharmacy(PrescriptionRepository repo) {
        return args -> {
            if (repo.count() == 0) {
                repo.saveAll(List.of(
                        new Prescription(1L, "John Doe", "Amoxicillin", "500mg", "3x daily with meals"),
                        new Prescription(2L, "Jane Smith", "Atorvastatin", "20mg", "Once daily at night"),
                        new Prescription(3L, "Leo Vance", "Ibuprofen Pediatric Suspension", "100mg/5mL", "Every 6 hours as needed")
                ));
            }
        };
    }
}
