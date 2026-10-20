package com.healops.core.repository;

import com.healops.core.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

public interface MonitoredServiceRepository extends JpaRepository<MonitoredService, Long> {
    Optional<MonitoredService> findByName(String name);
    List<MonitoredService> findByEnabledTrue();

    @Modifying
    @Transactional
    @Query("update MonitoredService s set s.currentStatus = :status, s.healthScore = :healthScore, "
            + "s.lastPolledAt = :lastPolledAt where s.id = :id and s.enabled = true")
    int updateProbeStateIfEnabled(@Param("id") Long id, @Param("status") ServiceStatus status,
            @Param("healthScore") int healthScore, @Param("lastPolledAt") LocalDateTime lastPolledAt);
}
