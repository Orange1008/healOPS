package com.mediflow.notification.config;

import com.mediflow.notification.model.Notification;
import com.mediflow.notification.repository.NotificationRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class NotificationDataInitializer {

    @Bean
    CommandLineRunner initNotifications(NotificationRepository repo) {
        return args -> {
            if (repo.count() == 0) {
                repo.saveAll(List.of(
                        new Notification("john.doe@email.com", "EMAIL", "Appointment Confirmed", "Your appointment with Dr. Jenkins is confirmed for tomorrow at 10:00 AM."),
                        new Notification("+1-555-0182", "SMS", "Prescription Ready", "Your prescription for Amoxicillin 500mg is ready for collection at MediFlow Pharmacy."),
                        new Notification("jane.smith@email.com", "EMAIL", "Laboratory Results Available", "Your lipid panel diagnostic report has been finalized and uploaded.")
                ));
            }
        };
    }
}
