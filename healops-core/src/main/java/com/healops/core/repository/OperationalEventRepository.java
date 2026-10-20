package com.healops.core.repository;

import com.healops.core.model.OperationalEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OperationalEventRepository extends JpaRepository<OperationalEvent, Long> {
    List<OperationalEvent> findTop100ByOrderByCreatedAtDesc();
}
