package com.healops.core.repository;

import com.healops.core.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

public interface MonitoredServiceRepository extends JpaRepository<MonitoredService, Long> {
    Optional<MonitoredService> findByName(String name);
    List<MonitoredService> findByEnabledTrue();
}
