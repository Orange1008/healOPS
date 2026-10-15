package com.healops.core.model;

public enum FailureType {
    SERVICE_CRASH,
    CONTAINER_STOPPED,
    DATABASE_LOST,
    HIGH_CPU,
    HIGH_MEMORY,
    SLOW_RESPONSE,
    NETWORK_TIMEOUT,
    HTTP_5XX_ERRORS
}
