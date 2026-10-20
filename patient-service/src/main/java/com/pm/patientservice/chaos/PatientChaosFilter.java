package com.pm.patientservice.chaos;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Applies HealOps-injected faults to the patient API while keeping health and reset routes available. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PatientChaosFilter extends OncePerRequestFilter {

    private final ChaosController chaosController;

    public PatientChaosFilter(ChaosController chaosController) {
        this.chaosController = chaosController;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !(path.equals("/api/patients") || path.startsWith("/api/patients/")
                || path.equals("/patients") || path.startsWith("/patients/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (chaosController.isDatabaseLostActive()) {
            response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Patient database is unavailable (HealOps fault injection)");
            return;
        }
        if (chaosController.isServiceCrashActive()) {
            response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Patient Service is unavailable (HealOps fault injection)");
            return;
        }
        if (chaosController.isCpuBurnActive() || chaosController.isMemoryPressureActive()) {
            response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Patient Service is degraded (HealOps fault injection)");
            return;
        }
        if (chaosController.isReturn500Active()) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Patient Service is returning injected HTTP 500 errors");
            return;
        }
        long latency = chaosController.getInjectedLatencyMs();
        if (latency > 0) {
            try {
                Thread.sleep(latency);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Patient request interrupted");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
