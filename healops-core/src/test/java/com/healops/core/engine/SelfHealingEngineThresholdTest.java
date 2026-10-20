package com.healops.core.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healops.core.model.FailureType;
import com.healops.core.model.Incident;
import com.healops.core.model.MonitoredService;
import com.healops.core.model.ServiceCategory;
import com.healops.core.model.ServiceMetric;
import com.healops.core.model.ServiceStatus;
import com.healops.core.orchestrator.OrchestratorService;
import com.healops.core.repository.IncidentRepository;
import com.healops.core.repository.MonitoredServiceRepository;
import com.healops.core.repository.PolicyRepository;
import com.healops.core.repository.RecoveryActionRepository;
import com.healops.core.repository.ServiceMetricRepository;
import com.healops.core.stream.EventBroadcaster;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.task.TaskExecutor;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SelfHealingEngineThresholdTest {

    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) server.stop(0);
    }

    @Test
    void intermittentFailuresDoNotCreateIncidentOrRecovery() throws Exception {
        SelfHealingEngine engine = engineWithHealthStatuses(false, true, false);
        MonitoredService service = service();

        poll(engine, service);
        assertEquals(ServiceStatus.WARNING, service.getCurrentStatus());
        poll(engine, service);
        assertEquals(ServiceStatus.WARNING, service.getCurrentStatus());
        poll(engine, service);

        assertEquals(ServiceStatus.WARNING, service.getCurrentStatus());
        verifyNoInteractions(incidents, orchestrator);
    }

    @Test
    void thirdConsecutiveFailureStartsIncidentHandling() throws Exception {
        SelfHealingEngine engine = engineWithHealthStatuses(false, false, false);
        MonitoredService service = service();
        when(incidents.findFirstByServiceIdAndStatusInOrderByDetectedAtDesc(eq(17L), anyList()))
                .thenReturn(Optional.empty());
        when(policies.findByFailureTypeAndEnabledTrueOrderByStepNumberAsc(FailureType.SERVICE_CRASH))
                .thenReturn(List.of());

        poll(engine, service);
        assertEquals(ServiceStatus.WARNING, service.getCurrentStatus());
        verify(incidents, never()).save(any());
        poll(engine, service);
        verify(incidents, never()).save(any());
        poll(engine, service);

        assertEquals(ServiceStatus.CRITICAL, service.getCurrentStatus());
        verify(incidents).save(any());
    }

    private IncidentRepository incidents;
    private PolicyRepository policies;
    private OrchestratorService orchestrator;
    private MonitoredServiceRepository services;
    private ServiceMetricRepository metrics;
    private RecoveryActionRepository actions;

    @Test
    void scheduledMonitoringWaitsUntilApplicationReady() throws Exception {
        SelfHealingEngine engine = engineWithHealthStatuses(false);
        when(services.findByEnabledTrue()).thenReturn(List.of());

        engine.runClosedLoop();
        verify(services, never()).findByEnabledTrue();

        ReflectionTestUtils.invokeMethod(engine, "enableMonitoringAfterApplicationReady");
        engine.runClosedLoop();
        verify(services).findByEnabledTrue();
    }

    @Test
    void scheduledMetricCleanupWaitsUntilApplicationReady() throws Exception {
        SelfHealingEngine engine = engineWithHealthStatuses(false);

        engine.pruneOldMetrics();
        verify(metrics, never()).deleteByCollectedAtBefore(any(LocalDateTime.class));

        ReflectionTestUtils.invokeMethod(engine, "enableMonitoringAfterApplicationReady");
        engine.pruneOldMetrics();
        verify(metrics).deleteByCollectedAtBefore(any(LocalDateTime.class));
    }

    @Test
    void externalTargetsCreateMonitorOnlyIncidentsWithoutRecoveryActions() throws Exception {
        SelfHealingEngine engine = engineWithExternalUnavailableStatuses(false, false, false);
        MonitoredService service = service();
        service.setCategory(ServiceCategory.EXTERNAL_API);
        when(services.findById(17L)).thenReturn(Optional.of(service));

        poll(engine, service);
        poll(engine, service);
        poll(engine, service);

        ArgumentCaptor<Incident> incidentCaptor = ArgumentCaptor.forClass(Incident.class);
        verify(incidents).save(incidentCaptor.capture());
        Incident incident = incidentCaptor.getValue();
        assertEquals("INFO", incident.getSeverity());
        assertEquals("UNRESOLVED", incident.getStatus());
        assertEquals("MONITOR_ONLY", incident.getRecommendedAction());
        assertTrue(incident.getDecisionReason().contains("three consecutive health probes"));
        assertTrue(incident.getDecisionReason().contains("cannot recover third-party systems"));
        verify(orchestrator, never()).executeRecovery(any(), any(), any(), any(), anyInt());
        verify(actions, never()).save(any());

        engine.handleInjectedFault(service, FailureType.SERVICE_CRASH);
        verify(orchestrator, never()).executeRecovery(any(), any(), any(), any(), anyInt());
    }

    @Test
    void existingExternalIncidentIsConvertedToMonitorOnlyWithoutRecovery() throws Exception {
        SelfHealingEngine engine = engineWithExternalUnavailableStatuses(false, false, false);
        MonitoredService service = service();
        service.setCategory(ServiceCategory.EXTERNAL_API);
        when(services.findById(17L)).thenReturn(Optional.of(service));
        Incident existing = new Incident(service, FailureType.SERVICE_CRASH, "CRITICAL",
                "Target process unreachable", "NOTIFY_ADMIN", "Old recovery recommendation", 1000L);
        when(incidents.findFirstByServiceIdAndStatusInOrderByDetectedAtDesc(eq(17L), anyList()))
                .thenReturn(Optional.of(existing));

        poll(engine, service);
        poll(engine, service);
        poll(engine, service);

        verify(incidents).save(existing);
        assertEquals("INFO", existing.getSeverity());
        assertEquals("UNRESOLVED", existing.getStatus());
        assertEquals("MONITOR_ONLY", existing.getRecommendedAction());
        assertTrue(existing.getDecisionReason().contains("three consecutive health probes"));
        verify(orchestrator, never()).executeRecovery(any(), any(), any(), any(), anyInt());
        verify(actions, never()).save(any());
    }

    @Test
    void probeFinishingAfterMonitoringStopsDoesNotCreateIncident() throws Exception {
        SelfHealingEngine engine = engineWithExternalUnavailableStatuses(false, false, false);
        MonitoredService service = service();
        service.setCategory(ServiceCategory.EXTERNAL_API);
        when(services.updateProbeStateIfEnabled(any(), any(), anyInt(), any(LocalDateTime.class))).thenReturn(0);

        poll(engine, service);
        poll(engine, service);
        poll(engine, service);

        verify(incidents, never()).save(any());
        verify(orchestrator, never()).executeRecovery(any(), any(), any(), any(), anyInt());
    }

    @Test
    void successfulExternalHtmlProbesRestoreHealthAndResolveIncident() throws Exception {
        SelfHealingEngine engine = engineWithHtmlHealthResponses();
        MonitoredService service = service();
        service.setCategory(ServiceCategory.EXTERNAL_API);
        service.setCurrentStatus(ServiceStatus.CRITICAL);
        service.setHealthScore(15);
        Incident existing = new Incident(service, FailureType.SERVICE_CRASH, "INFO",
                "External endpoint was unavailable", "MONITOR_ONLY", "Monitoring only", null);
        existing.setStatus("UNRESOLVED");
        when(incidents.findByServiceIdOrderByDetectedAtDesc(17L)).thenReturn(List.of(existing));

        poll(engine, service);
        poll(engine, service);
        poll(engine, service);

        assertEquals(ServiceStatus.HEALTHY, service.getCurrentStatus());
        assertEquals(100, service.getHealthScore());
        assertEquals("RECOVERED", existing.getStatus());
        verify(orchestrator, never()).executeRecovery(any(), any(), any(), any(), anyInt());
        verify(actions, never()).save(any());
    }

    @Test
    void slowSuccessfulExternalHtmlProbeKeepsAvailabilityHealthyAndRecordsLatency() throws Exception {
        SelfHealingEngine engine = engineWithHtmlHealthResponses(1600, 1500);
        MonitoredService service = service();
        service.setCategory(ServiceCategory.EXTERNAL_API);

        poll(engine, service);

        assertEquals(ServiceStatus.HEALTHY, service.getCurrentStatus());
        assertEquals(100, service.getHealthScore());
        ArgumentCaptor<ServiceMetric> metricCaptor = ArgumentCaptor.forClass(ServiceMetric.class);
        verify(metrics).save(metricCaptor.capture());
        assertTrue(metricCaptor.getValue().getResponseTimeMs() >= 1500);
        verify(incidents, never()).save(any());
        verify(orchestrator, never()).executeRecovery(any(), any(), any(), any(), anyInt());
    }

    private SelfHealingEngine engineWithHtmlHealthResponses() throws Exception {
        return engineWithHtmlHealthResponses(0, 2000);
    }

    private SelfHealingEngine engineWithHtmlHealthResponses(long responseDelayMs) throws Exception {
        return engineWithHtmlHealthResponses(responseDelayMs, 2000);
    }

    private SelfHealingEngine engineWithHtmlHealthResponses(long responseDelayMs, long slowResponseThresholdMs)
            throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/health", exchange -> {
            if (responseDelayMs > 0) {
                try {
                    Thread.sleep(responseDelayMs);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    exchange.close();
                    return;
                }
            }
            byte[] body = "<html><body>Public website is available</body></html>".getBytes();
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();

        services = mock(MonitoredServiceRepository.class);
        when(services.updateProbeStateIfEnabled(any(), any(), anyInt(), any(LocalDateTime.class))).thenReturn(1);
        metrics = mock(ServiceMetricRepository.class);
        incidents = mock(IncidentRepository.class);
        policies = mock(PolicyRepository.class);
        actions = mock(RecoveryActionRepository.class);
        orchestrator = mock(OrchestratorService.class);
        EventBroadcaster broadcaster = mock(EventBroadcaster.class);
        TaskExecutor executor = mock(TaskExecutor.class);

        return new SelfHealingEngine(services, metrics, incidents, policies, actions,
                orchestrator, broadcaster, new RestTemplateBuilder(), executor, 5000,
                new ObjectMapper(), 90, 0.85, slowResponseThresholdMs, 24);
    }

    private SelfHealingEngine engineWithExternalUnavailableStatuses(boolean... healthySamples) throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicInteger nextStatus = new AtomicInteger();
        server.createContext("/health", exchange -> {
            int index = Math.min(nextStatus.getAndIncrement(), healthySamples.length - 1);
            byte[] body = "<html>external endpoint</html>".getBytes();
            exchange.sendResponseHeaders(healthySamples[index] ? 200 : 503, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();

        services = mock(MonitoredServiceRepository.class);
        when(services.updateProbeStateIfEnabled(any(), any(), anyInt(), any(LocalDateTime.class))).thenReturn(1);
        metrics = mock(ServiceMetricRepository.class);
        incidents = mock(IncidentRepository.class);
        policies = mock(PolicyRepository.class);
        actions = mock(RecoveryActionRepository.class);
        orchestrator = mock(OrchestratorService.class);
        EventBroadcaster broadcaster = mock(EventBroadcaster.class);
        TaskExecutor executor = mock(TaskExecutor.class);

        return new SelfHealingEngine(services, metrics, incidents, policies, actions,
                orchestrator, broadcaster, new RestTemplateBuilder(), executor, 5000,
                new ObjectMapper(), 90, 0.85, 2000, 24);
    }

    private SelfHealingEngine engineWithHealthStatuses(boolean... healthySamples) throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicInteger nextStatus = new AtomicInteger();
        server.createContext("/health", exchange -> {
            int index = Math.min(nextStatus.getAndIncrement(), healthySamples.length - 1);
            byte[] body = (healthySamples[index] ? "{\"status\":\"UP\"}" : "{\"status\":\"DOWN\"}")
                    .getBytes();
            exchange.sendResponseHeaders(200, body.length);
            if (body.length > 0) exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();

        services = mock(MonitoredServiceRepository.class);
        when(services.updateProbeStateIfEnabled(any(), any(), anyInt(), any(LocalDateTime.class))).thenReturn(1);
        metrics = mock(ServiceMetricRepository.class);
        incidents = mock(IncidentRepository.class);
        policies = mock(PolicyRepository.class);
        actions = mock(RecoveryActionRepository.class);
        orchestrator = mock(OrchestratorService.class);
        EventBroadcaster broadcaster = mock(EventBroadcaster.class);
        TaskExecutor executor = mock(TaskExecutor.class);

        return new SelfHealingEngine(services, metrics, incidents, policies, actions,
                orchestrator, broadcaster, new RestTemplateBuilder(), executor, 5000,
                new ObjectMapper(), 90, 0.85, 2000, 24);
    }

    private MonitoredService service() {
        MonitoredService service = new MonitoredService(
                "threshold-test", ServiceCategory.INTERNAL_MICROSERVICE,
                "http://127.0.0.1:" + server.getAddress().getPort() + "/health",
                null, null, "threshold-test", 0, "", "");
        service.setId(17L);
        return service;
    }

    private void poll(SelfHealingEngine engine, MonitoredService service) {
        ReflectionTestUtils.invokeMethod(engine, "pollAndAnalyze", service);
    }
}
