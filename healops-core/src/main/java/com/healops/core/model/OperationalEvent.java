package com.healops.core.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "operational_events")
public class OperationalEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String eventType;
    private String serviceName;
    @Column(length = 2000)
    private String description;
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public OperationalEvent() {}
    public OperationalEvent(String eventType, String serviceName, String description) {
        this.eventType = eventType;
        this.serviceName = serviceName;
        this.description = description;
        this.createdAt = LocalDateTime.now();
    }
    public Long getId() { return id; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getServiceName() { return serviceName; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
