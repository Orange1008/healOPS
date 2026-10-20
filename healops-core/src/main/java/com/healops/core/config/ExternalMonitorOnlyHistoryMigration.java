package com.healops.core.config;

import com.healops.core.model.Incident;
import com.healops.core.model.ServiceCategory;
import com.healops.core.repository.IncidentRepository;
import com.healops.core.repository.RecoveryActionRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Removes legacy recovery records created for third-party targets before monitor-only handling existed. */
@Component
public class ExternalMonitorOnlyHistoryMigration implements ApplicationRunner {
    private final IncidentRepository incidentRepository;
    private final RecoveryActionRepository recoveryActionRepository;

    public ExternalMonitorOnlyHistoryMigration(IncidentRepository incidentRepository,
                                               RecoveryActionRepository recoveryActionRepository) {
        this.incidentRepository = incidentRepository;
        this.recoveryActionRepository = recoveryActionRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (Incident incident : incidentRepository.findAll()) {
            if (incident.getService() == null || incident.getService().getCategory() != ServiceCategory.EXTERNAL_API) continue;
            incident.setSeverity("INFO");
            incident.setRecommendedAction("MONITOR_ONLY");
            incident.setDecisionReason("The external endpoint failed three consecutive health probes. "
                    + "HealOps cannot recover third-party systems. Monitoring continues until the endpoint becomes healthy.");
            incident.setEstimatedMttrMs(null);
            incidentRepository.save(incident);
            recoveryActionRepository.deleteAll(recoveryActionRepository.findByIncidentIdOrderByStepNumberAsc(incident.getId()));
        }
    }
}
