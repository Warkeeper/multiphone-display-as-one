package com.example.multiphone.model;

public record RoomStatusResponse(
        String roomId,
        int joinedCount,
        int reportedReadyCount,
        int deviceCount,
        long startTimestamp,
        boolean ready,
        int[] viewportWidths
) {
}
