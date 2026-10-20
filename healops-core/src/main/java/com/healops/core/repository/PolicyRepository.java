package com.healops.core.repository;

import com.healops.core.model.FailureType;
import com.healops.core.model.Policy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

public interface PolicyRepository extends JpaRepository<Policy, Long> {
    List<Policy> findByFailureTypeAndEnabledTrueOrderByStepNumberAsc(FailureType failureType);
    boolean existsByFailureType(FailureType failureType);
    List<Policy> findAllByOrderByFailureTypeAscStepNumberAsc();
}
