package com.mediflow.clinical;

import com.mediflow.doctor.chaos.ChaosController;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** Applies the one Clinical Service fault state to every clinical domain endpoint. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ClinicalChaosFilter extends OncePerRequestFilter {
    private final ChaosController chaosController;

    public ClinicalChaosFilter(ChaosController chaosController) {
        this.chaosController = chaosController;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !(path.startsWith("/api/doctors") || path.startsWith("/api/appointments")
                || path.startsWith("/api/laboratory") || path.startsWith("/api/pharmacy")
                || path.startsWith("/api/inventory"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (chaosController.isDatabaseLostActive() || chaosController.isServiceCrashActive()
                || chaosController.isCpuBurnActive() || chaosController.isMemoryPressureActive()) {
            response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Clinical Service is temporarily unavailable");
            return;
        }
        if (chaosController.isReturn500Active()) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Clinical Service is temporarily unavailable");
            return;
        }
        long latency = chaosController.getInjectedLatencyMs();
        if (latency > 0) {
            try {
                Thread.sleep(latency);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Clinical request interrupted");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
