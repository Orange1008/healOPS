package com.healops.core.config;

import com.healops.core.model.*;
import com.healops.core.repository.MonitoredServiceRepository;
import com.healops.core.repository.PolicyRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(
            MonitoredServiceRepository serviceRepo,
            PolicyRepository policyRepo
    ) {
        return args -> {
            // Seed Monitored Hospital Microservices (MediFlow Internal)
            if (serviceRepo.count() == 0) {
                // 1. Patient Service
                serviceRepo.save(new MonitoredService(
                        "patient-service",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        "http://localhost:4000/actuator/health",
                        "http://localhost:4000/actuator/metrics",
                        "http://localhost:4000/chaos",
                        "patient-service",
                        4000,
                        "auth-service,billing-service",
                        "CLEAR_CHAOS,RECONNECT_DB_POOL,RESTART_CONTAINER"
                ));

                // 2. Billing Service
                serviceRepo.save(new MonitoredService(
                        "billing-service",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        "http://localhost:4001/actuator/health",
                        "http://localhost:4001/actuator/metrics",
                        "http://localhost:4001/chaos",
                        "billing-service",
                        4001,
                        "patient-service,auth-service",
                        "CLEAR_CHAOS,RECONNECT_DB_POOL,RESTART_CONTAINER"
                ));

                // 3. Auth Service
                serviceRepo.save(new MonitoredService(
                        "auth-service",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        "http://localhost:4005/actuator/health",
                        "http://localhost:4005/actuator/metrics",
                        null,
                        "auth-service",
                        4005,
                        "",
                        "RESTART_CONTAINER"
                ));

                // 4. Doctor Service
                serviceRepo.save(new MonitoredService(
                        "doctor-service",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        "http://localhost:4002/actuator/health",
                        "http://localhost:4002/actuator/metrics",
                        "http://localhost:4002/chaos",
                        "doctor-service",
                        4002,
                        "auth-service",
                        "CLEAR_CHAOS,RECONNECT_DB_POOL,RESTART_CONTAINER"
                ));

                // 5. Appointment Service
                serviceRepo.save(new MonitoredService(
                        "appointment-service",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        "http://localhost:4003/actuator/health",
                        "http://localhost:4003/actuator/metrics",
                        "http://localhost:4003/chaos",
                        "appointment-service",
                        4003,
                        "doctor-service,patient-service",
                        "CLEAR_CHAOS,RECONNECT_DB_POOL,RESTART_CONTAINER"
                ));

                // 6. Inventory Service
                serviceRepo.save(new MonitoredService(
                        "inventory-service",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        "http://localhost:4004/actuator/health",
                        "http://localhost:4004/actuator/metrics",
                        "http://localhost:4004/chaos",
                        "inventory-service",
                        4004,
                        "auth-service",
                        "CLEAR_CHAOS,RECONNECT_DB_POOL,RESTART_CONTAINER"
                ));

                // 7. Pharmacy Service
                serviceRepo.save(new MonitoredService(
                        "pharmacy-service",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        "http://localhost:4006/actuator/health",
                        "http://localhost:4006/actuator/metrics",
                        "http://localhost:4006/chaos",
                        "pharmacy-service",
                        4006,
                        "inventory-service,patient-service",
                        "CLEAR_CHAOS,RECONNECT_DB_POOL,RESTART_CONTAINER"
                ));

                // 8. Laboratory Service
                serviceRepo.save(new MonitoredService(
                        "laboratory-service",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        "http://localhost:4007/actuator/health",
                        "http://localhost:4007/actuator/metrics",
                        "http://localhost:4007/chaos",
                        "laboratory-service",
                        4007,
                        "patient-service,doctor-service",
                        "CLEAR_CHAOS,RECONNECT_DB_POOL,RESTART_CONTAINER"
                ));

                // 9. Notification Service
                serviceRepo.save(new MonitoredService(
                        "notification-service",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        "http://localhost:4008/actuator/health",
                        "http://localhost:4008/actuator/metrics",
                        "http://localhost:4008/chaos",
                        "notification-service",
                        4008,
                        "",
                        "CLEAR_CHAOS,RESTART_CONTAINER"
                ));

                // 10. API Gateway
                serviceRepo.save(new MonitoredService(
                        "api-gateway",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        "http://localhost:8080/actuator/health",
                        "http://localhost:8080/actuator/metrics",
                        null,
                        "api-gateway",
                        8080,
                        "auth-service,patient-service,doctor-service,billing-service",
                        "RESTART_CONTAINER"
                ));

                // Seed External APIs
                serviceRepo.save(new MonitoredService(
                        "Google DNS & Gateway",
                        ServiceCategory.EXTERNAL_API,
                        "https://www.google.com",
                        null,
                        null,
                        null,
                        443,
                        "",
                        "NOTIFY_ADMIN"
                ));
            }

            // Seed Default Escalation Policies
            if (policyRepo.count() == 0) {
                policyRepo.saveAll(List.of(
                        new Policy(FailureType.DATABASE_LOST, 1, "RECONNECT_DB_POOL", 3, 60),
                        new Policy(FailureType.DATABASE_LOST, 2, "RESTART_SERVICE", 2, 120),
                        new Policy(FailureType.DATABASE_LOST, 3, "RESTART_CONTAINER", 1, 300),

                        new Policy(FailureType.HIGH_CPU, 1, "CLEAR_CHAOS", 3, 60),
                        new Policy(FailureType.HIGH_CPU, 2, "RESTART_CONTAINER", 1, 120),

                        new Policy(FailureType.HIGH_MEMORY, 1, "CLEAR_CHAOS", 3, 60),
                        new Policy(FailureType.HIGH_MEMORY, 2, "RESTART_CONTAINER", 1, 120),

                        new Policy(FailureType.SLOW_RESPONSE, 1, "CLEAR_CHAOS", 3, 60),
                        new Policy(FailureType.SLOW_RESPONSE, 2, "RESTART_SERVICE", 2, 120),

                        new Policy(FailureType.SERVICE_CRASH, 1, "RESTART_CONTAINER", 3, 120),
                        new Policy(FailureType.CONTAINER_STOPPED, 1, "RESTART_CONTAINER", 3, 120),
                        new Policy(FailureType.NETWORK_TIMEOUT, 1, "RESTART_CONTAINER", 2, 120)
                ));
            }
        };
    }
}
