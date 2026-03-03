package com.example.multiphone.model;

public record ReadyResponse(
        int reportedReadyCount,
        int deviceCount,
        long startTimestamp
) {
}
