package com.mediflow.doctor.config;

import com.mediflow.doctor.model.Doctor;
import com.mediflow.doctor.repository.DoctorRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class DoctorDataInitializer {

    @Bean
    CommandLineRunner initDoctors(DoctorRepository doctorRepo) {
        return args -> {
            if (doctorRepo.count() == 0) {
                doctorRepo.saveAll(List.of(
                        new Doctor("Dr. Sarah Jenkins", "Cardiology", "Cardiovascular Medicine", "s.jenkins@mediflow.hospital", "+1-555-0192"),
                        new Doctor("Dr. Robert Chen", "Neurology", "Neuroscience Institute", "r.chen@mediflow.hospital", "+1-555-0193"),
                        new Doctor("Dr. Amara Patel", "Pediatrics", "Childrens Health", "a.patel@mediflow.hospital", "+1-555-0194"),
                        new Doctor("Dr. Marcus Vance", "Orthopedics", "Bone & Joint Center", "m.vance@mediflow.hospital", "+1-555-0195")
                ));
            }
        };
    }
}
