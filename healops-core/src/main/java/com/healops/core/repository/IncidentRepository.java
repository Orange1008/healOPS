package com.healops.core.repository;

import com.healops.core.model.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

public interface IncidentRepository extends JpaRepository<Incident, Long> {
    List<Incident> findTop20ByOrderByDetectedAtDesc();
    List<Incident> findTop100ByOrderByDetectedAtDesc();
    long countByStatusIgnoreCaseAndResolvedAtAfter(String status, LocalDateTime since);
    List<Incident> findAllByOrderByDetectedAtDesc();
    List<Incident> findByServiceIdOrderByDetectedAtDesc(Long serviceId);
    Optional<Incident> findFirstByServiceIdAndStatusInOrderByDetectedAtDesc(Long serviceId, List<String> statuses);
}
