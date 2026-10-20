package com.pm.patientservice.integration;

import com.pm.patientservice.grpc.BillingServiceGrpcClient;
import com.pm.patientservice.kafka.KafkaProducer;
import com.pm.patientservice.model.Patient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/** Keeps optional downstream integrations off the patient registration request path. */
@Service
public class PatientIntegrationService {

  private static final Logger log = LoggerFactory.getLogger(PatientIntegrationService.class);

  private final BillingServiceGrpcClient billingServiceGrpcClient;
  private final KafkaProducer kafkaProducer;

  public PatientIntegrationService(BillingServiceGrpcClient billingServiceGrpcClient,
      KafkaProducer kafkaProducer) {
    this.billingServiceGrpcClient = billingServiceGrpcClient;
    this.kafkaProducer = kafkaProducer;
  }

  @Async("patientIntegrationExecutor")
  public void onPatientCreated(Patient patient) {
    try {
      billingServiceGrpcClient.createBillingAccount(patient.getId().toString(),
          patient.getName(), patient.getEmail());
    } catch (Exception e) {
      log.warn("Billing integration failed for patient {}; registration remains saved", patient.getId(), e);
    }
    try {
      kafkaProducer.sendEvent(patient);
    } catch (Exception e) {
      log.warn("Patient event could not be queued for {}; registration remains saved", patient.getId(), e);
    }
  }
}
