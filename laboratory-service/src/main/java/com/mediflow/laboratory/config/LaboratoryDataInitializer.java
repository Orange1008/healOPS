package com.mediflow.laboratory.config;

import com.mediflow.laboratory.model.LabReport;
import com.mediflow.laboratory.repository.LabReportRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class LaboratoryDataInitializer {

    @Bean
    CommandLineRunner initLab(LabReportRepository repo) {
        return args -> {
            if (repo.count() == 0) {
                repo.saveAll(List.of(
                        new LabReport(1L, "John Doe", "Complete Blood Count (CBC)", "WBC: 7.2, RBC: 4.8, Platelets: 240k - Normal", "COMPLETED"),
                        new LabReport(2L, "Jane Smith", "Lipid Panel", "Total Cholesterol: 220 mg/dL (Elevated), HDL: 48, LDL: 145", "COMPLETED"),
                        new LabReport(3L, "Leo Vance", "Pediatric Comprehensive Metabolic Panel", "Glucose: 92, Calcium: 9.8 - Within healthy thresholds", "COMPLETED")
                ));
            }
        };
    }
}
