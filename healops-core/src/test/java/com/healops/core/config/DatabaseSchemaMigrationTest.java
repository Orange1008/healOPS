package com.healops.core.config;

import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DatabaseSchemaMigrationTest {

    @Test
    void widensDecisionReasonOnExistingSchemaAndIsRepeatable() {
        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:migrationtest;DB_CLOSE_DELAY=-1");
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        jdbc.execute("CREATE TABLE service_metrics (cpu_percent DOUBLE NOT NULL, memory_mb DOUBLE NOT NULL)");
        jdbc.execute("CREATE TABLE incidents (decision_reason VARCHAR(255))");
        jdbc.execute("CREATE TABLE monitored_services (current_status ENUM('HEALTHY','WARNING','CRITICAL','DOWN'))");

        DatabaseSchemaMigration migration = new DatabaseSchemaMigration(jdbc);
        migration.run(null);
        migration.run(null);

        Long actualLength = jdbc.queryForObject("""
                SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'INCIDENTS'
                  AND COLUMN_NAME = 'DECISION_REASON'
                """, Long.class);
        assertEquals(1024L, actualLength);
    }
}
