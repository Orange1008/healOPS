package com.healops.core.repository;

import com.healops.core.model.ServiceMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

public interface ServiceMetricRepository extends JpaRepository<ServiceMetric, Long> {
    List<ServiceMetric> findByServiceIdOrderByCollectedAtDesc(Long serviceId);
    List<ServiceMetric> findByServiceIdAndCollectedAtAfterOrderByCollectedAtAsc(Long serviceId, LocalDateTime after);
}
