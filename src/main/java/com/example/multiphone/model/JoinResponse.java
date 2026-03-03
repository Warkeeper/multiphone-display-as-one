package com.example.multiphone.model;

public record JoinResponse(
        int deviceIndex,
        int deviceCount,
        String text,
        int speed,
        int fontSize,
        String color,
        long startTimestamp
) {
}
