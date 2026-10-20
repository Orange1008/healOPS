package com.healops.core.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Applies additive/compatible changes that Hibernate's update mode cannot make to existing databases. */
@Component
public class DatabaseSchemaMigration implements ApplicationRunner {
    private final JdbcTemplate jdbcTemplate;

    public DatabaseSchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        // Older HealOps volumes created these telemetry columns as NOT NULL. Current probes
        // deliberately store SQL NULL when a service does not expose that metric.
        jdbcTemplate.execute("ALTER TABLE service_metrics ALTER COLUMN cpu_percent SET NULL");
        jdbcTemplate.execute("ALTER TABLE service_metrics ALTER COLUMN memory_mb SET NULL");

        // Explainable policy decisions can exceed Hibernate/H2's default 255
        // character string size. Widen existing persistent databases in place.
        Long decisionReasonLength = jdbcTemplate.queryForObject("""
                SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'INCIDENTS'
                  AND COLUMN_NAME = 'DECISION_REASON'
                """, Long.class);
        if (decisionReasonLength != null && decisionReasonLength < 1024L) {
            jdbcTemplate.execute("ALTER TABLE incidents ALTER COLUMN decision_reason SET DATA TYPE VARCHAR(1024)");
        }

        // H2 maps @Enumerated(EnumType.STRING) to a native ENUM type. Hibernate's
        // update mode does not widen that type when a new Java enum value is added.
        String statusDataType = jdbcTemplate.queryForObject("""
                SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'MONITORED_SERVICES'
                  AND COLUMN_NAME = 'CURRENT_STATUS'
                """, String.class);
        if (statusDataType != null && !statusDataType.toUpperCase(Locale.ROOT).contains("CHARACTER VARYING")) {
            jdbcTemplate.execute("ALTER TABLE monitored_services ALTER COLUMN current_status SET DATA TYPE VARCHAR(255)");
        }

        // Existing volumes have a Hibernate-generated enum check constraint that predates
        // RECOVERING. Widen that constraint in place so recovery state can be persisted.
        List<Map<String, Object>> checks = jdbcTemplate.queryForList("""
                SELECT tc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
                  ON tc.CONSTRAINT_CATALOG = cc.CONSTRAINT_CATALOG
                 AND tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
                 AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
                WHERE tc.TABLE_SCHEMA = 'PUBLIC'
                  AND tc.TABLE_NAME = 'MONITORED_SERVICES'
                  AND tc.CONSTRAINT_TYPE = 'CHECK'
                """);
        boolean hasRecoveringStatus = checks.stream().anyMatch(check ->
                String.valueOf(check.get("CHECK_CLAUSE")).toLowerCase(Locale.ROOT).contains("recovering"));
        if (!hasRecoveringStatus) {
            for (Map<String, Object> check : checks) {
                String clause = String.valueOf(check.get("CHECK_CLAUSE")).toLowerCase(Locale.ROOT);
                // Hibernate's H2 enum check clause lists enum values but may omit the
                // column name, so identify this enum by its stable status values.
                if (clause.contains("critical") && clause.contains("warning")) {
                    String constraint = String.valueOf(check.get("CONSTRAINT_NAME")).replace("\"", "\"\"");
                    jdbcTemplate.execute("ALTER TABLE monitored_services DROP CONSTRAINT \"" + constraint + "\"");
                }
            }
            jdbcTemplate.execute("""
                    ALTER TABLE monitored_services ADD CONSTRAINT ck_monitored_services_current_status
                    CHECK (current_status IN ('HEALTHY', 'WARNING', 'RECOVERING', 'CRITICAL', 'DOWN'))
                    """);
        }
    }
}
