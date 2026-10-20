package com.mediflow.appointment.config;

import com.mediflow.appointment.model.Appointment;
import com.mediflow.appointment.repository.AppointmentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.util.List;

@Configuration
public class AppointmentDataInitializer {

    @Bean
    CommandLineRunner initAppointments(AppointmentRepository repo) {
        return args -> {
            if (repo.count() == 0) {
                repo.saveAll(List.of(
                        new Appointment(1L, 1L, "Dr. Sarah Jenkins", "John Doe", LocalDateTime.now().plusDays(1), "Routine Cardiology Checkup"),
                        new Appointment(2L, 2L, "Dr. Robert Chen", "Jane Smith", LocalDateTime.now().plusDays(2), "Persistent Migraine Consultation"),
                        new Appointment(3L, 3L, "Dr. Amara Patel", "Leo Vance", LocalDateTime.now().plusDays(3), "Annual Pediatric Wellness Exam")
                ));
            }
        };
    }
}
