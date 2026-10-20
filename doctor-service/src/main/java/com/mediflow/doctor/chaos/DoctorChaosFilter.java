package com.mediflow.doctor.chaos;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Applies HealOps-injected faults to clinician workflows and leaves monitoring/reset routes available. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DoctorChaosFilter extends OncePerRequestFilter {

    private final ChaosController chaosController;

    public DoctorChaosFilter(ChaosController chaosController) {
        this.chaosController = chaosController;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !(path.equals("/api/doctors") || path.startsWith("/api/doctors/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (chaosController.isDatabaseLostActive() || chaosController.isServiceCrashActive()
                || chaosController.isCpuBurnActive() || chaosController.isMemoryPressureActive()) {
            response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Doctor Service is temporarily unavailable");
            return;
        }
        if (chaosController.isReturn500Active()) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Doctor Service is temporarily unavailable");
            return;
        }
        long latency = chaosController.getInjectedLatencyMs();
        if (latency > 0) {
            try {
                Thread.sleep(latency);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Doctor request interrupted");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
