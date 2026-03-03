package com.example.multiphone.model;

import java.util.concurrent.atomic.AtomicInteger;

public class Room {
    private final String roomId;
    private final int deviceCount;
    private final String text;
    private final int speed;
    private final int fontSize;
    private final String color;
    private final long startTimestamp;
    private final AtomicInteger assignedCount = new AtomicInteger(0);

    public Room(String roomId, int deviceCount, String text, int speed, int fontSize, String color, long startTimestamp) {
        this.roomId = roomId;
        this.deviceCount = deviceCount;
        this.text = text;
        this.speed = speed;
        this.fontSize = fontSize;
        this.color = color;
        this.startTimestamp = startTimestamp;
    }

    public String getRoomId() {
        return roomId;
    }

    public int getDeviceCount() {
        return deviceCount;
    }

    public String getText() {
        return text;
    }

    public int getSpeed() {
        return speed;
    }

    public int getFontSize() {
        return fontSize;
    }

    public String getColor() {
        return color;
    }

    public long getStartTimestamp() {
        return startTimestamp;
    }

    public int allocateDeviceIndex() {
        return assignedCount.incrementAndGet();
    }

    public int getAssignedCount() {
        return assignedCount.get();
    }
}
