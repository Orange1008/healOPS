package com.healops.core.config;

import com.healops.core.model.*;
import com.healops.core.repository.MonitoredServiceRepository;
import com.healops.core.repository.PolicyRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Arrays;
import java.util.Set;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(
            MonitoredServiceRepository serviceRepo,
            PolicyRepository policyRepo
    ) {
        return args -> {
            boolean inDocker = "true".equalsIgnoreCase(System.getenv("DOCKER_CONTAINER")) || "true".equalsIgnoreCase(System.getenv("IN_DOCKER"));
            java.util.function.BiFunction<String, Integer, String> getUrl = (svcName, port) -> 
                inDocker ? "http://" + svcName + ":" + port : "http://localhost:" + port;

            // Seed Monitored Hospital Microservices (MediFlow Internal)
            if (serviceRepo.count() == 0) {
                // 1. Patient Service
                serviceRepo.save(new MonitoredService(
                        "patient-service",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        getUrl.apply("patient-service", 4000) + "/actuator/health",
                        getUrl.apply("patient-service", 4000) + "/actuator/metrics",
                        getUrl.apply("patient-service", 4000) + "/chaos",
                        "patient-service",
                        4000,
                        "auth-service,billing-service",
                        "CLEAR_CHAOS,RECONNECT_DB_POOL,RESTART_CONTAINER"
                ));

                // Auth Service has monitoring only; it does not expose fault injection endpoints.
                serviceRepo.save(new MonitoredService(
                        "auth-service",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        getUrl.apply("auth-service", 4005) + "/actuator/health",
                        getUrl.apply("auth-service", 4005) + "/actuator/metrics",
                        null,
                        "auth-service",
                        4005,
                        "",
                        "RESTART_CONTAINER"
                ));

                // Clinical domain consolidates doctors, appointments, laboratory, pharmacy, and inventory.
                serviceRepo.save(new MonitoredService(
                        "clinical-service",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        getUrl.apply("clinical-service", 4002) + "/actuator/health",
                        getUrl.apply("clinical-service", 4002) + "/actuator/metrics",
                        getUrl.apply("clinical-service", 4002) + "/chaos",
                        "clinical-service",
                        4002,
                        "auth-service,patient-service",
                        "CLEAR_CHAOS,RECONNECT_DB_POOL,RESTART_CONTAINER"
                ));

                // 10. API Gateway
                serviceRepo.save(new MonitoredService(
                        "api-gateway",
                        ServiceCategory.INTERNAL_MICROSERVICE,
                        getUrl.apply("api-gateway", 8080) + "/actuator/health",
                        getUrl.apply("api-gateway", 8080) + "/actuator/metrics",
                        null,
                        "api-gateway",
                        8080,
                        "auth-service,patient-service,clinical-service",
                        "RESTART_CONTAINER"
                ));

            }

            // Keep fault controls tied to endpoints implemented by each running service.
            serviceRepo.findByName("patient-service").ifPresent(service -> {
                service.setSupportedFaults("HIGH_CPU,HIGH_MEMORY,DATABASE_LOST,SLOW_RESPONSE,HTTP_5XX_ERRORS,SERVICE_CRASH");
                serviceRepo.save(service);
            });
            serviceRepo.findByName("clinical-service").ifPresent(service -> {
                service.setSupportedFaults("HIGH_CPU,HIGH_MEMORY,DATABASE_LOST,SLOW_RESPONSE,HTTP_5XX_ERRORS,SERVICE_CRASH");
                serviceRepo.save(service);
            });
            serviceRepo.findByName("auth-service").ifPresent(service -> {
                service.setSupportedFaults("");
                serviceRepo.save(service);
            });
            serviceRepo.findByName("api-gateway").ifPresent(service -> {
                service.setSupportedFaults("");
                serviceRepo.save(service);
            });
            serviceRepo.flush();

            Set<String> optionalServices = Set.of("billing-service", "notification-service");
            Set<String> enabledOptionalServices = Arrays.stream(
                            System.getenv().getOrDefault("HEALOPS_ENABLED_OPTIONAL_SERVICES", "").split(","))
                    .map(String::trim)
                    .filter(name -> !name.isEmpty())
                    .collect(java.util.stream.Collectors.toSet());
            List<MonitoredService> optionalServiceRecords = serviceRepo.findAll().stream()
                    .filter(service -> optionalServices.contains(service.getName()))
                    .toList();
            optionalServiceRecords.forEach(service ->
                    service.setEnabled(enabledOptionalServices.contains(service.getName())));
            serviceRepo.saveAll(optionalServiceRecords);
            serviceRepo.flush();

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

                        new Policy(FailureType.HTTP_5XX_ERRORS, 1, "CLEAR_CHAOS", 3, 60),
                        new Policy(FailureType.HTTP_5XX_ERRORS, 2, "RESTART_CONTAINER", 1, 120),

                        new Policy(FailureType.SERVICE_CRASH, 1, "RESTART_CONTAINER", 3, 120),
                        new Policy(FailureType.CONTAINER_STOPPED, 1, "RESTART_CONTAINER", 3, 120),
                        new Policy(FailureType.NETWORK_TIMEOUT, 1, "RESTART_CONTAINER", 2, 120)
                ));
            }
            // Existing persistent databases may already contain the original
            // policy set, so add the newer 5xx policy without resetting history.
            if (!policyRepo.existsByFailureType(FailureType.HTTP_5XX_ERRORS)) {
                policyRepo.saveAll(List.of(
                        new Policy(FailureType.HTTP_5XX_ERRORS, 1, "CLEAR_CHAOS", 3, 60),
                        new Policy(FailureType.HTTP_5XX_ERRORS, 2, "RESTART_CONTAINER", 1, 120)
                ));
            }
        };
    }
}
