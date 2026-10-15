package com.healops.core.repository;

import com.healops.core.model.RecoveryAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

public interface RecoveryActionRepository extends JpaRepository<RecoveryAction, Long> {
    List<RecoveryAction> findByIncidentIdOrderByStepNumberAsc(Long incidentId);
}
