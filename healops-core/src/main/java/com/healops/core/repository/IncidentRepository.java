package com.healops.core.repository;

import com.healops.core.model.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

public interface IncidentRepository extends JpaRepository<Incident, Long> {
    List<Incident> findTop20ByOrderByDetectedAtDesc();
    List<Incident> findByServiceIdOrderByDetectedAtDesc(Long serviceId);
    Optional<Incident> findFirstByServiceIdAndStatusInOrderByDetectedAtDesc(Long serviceId, List<String> statuses);
}
