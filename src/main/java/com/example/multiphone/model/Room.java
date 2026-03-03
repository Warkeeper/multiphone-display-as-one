package com.example.multiphone.model;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class Room {
    private final String roomId;
    private final int deviceCount;
    private final String text;
    private final int speed;
    private final int fontSize;
    private final String color;
    private final AtomicInteger assignedCount = new AtomicInteger(0);
    private final AtomicLong startTimestamp = new AtomicLong(0);

    public Room(String roomId, int deviceCount, String text, int speed, int fontSize, String color) {
        this.roomId = roomId;
        this.deviceCount = deviceCount;
        this.text = text;
        this.speed = speed;
        this.fontSize = fontSize;
        this.color = color;
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
        return startTimestamp.get();
    }

    /**
     * 使用 AtomicInteger 安全分配设备编号，超出容量返回 -1。
     */
    public int tryAllocateDeviceIndex() {
        while (true) {
            int current = assignedCount.get();
            if (current >= deviceCount) {
                return -1;
            }
            int next = current + 1;
            if (assignedCount.compareAndSet(current, next)) {
                return next;
            }
        }
    }

    public int getAssignedCount() {
        return assignedCount.get();
    }

    /**
     * 当设备加入数达到设定数量后，设置统一开始时间（仅设置一次）。
     */
    public long triggerCountdownIfReady(long delayMillis) {
        if (assignedCount.get() >= deviceCount) {
            long planned = Instant.now().toEpochMilli() + delayMillis;
            startTimestamp.compareAndSet(0, planned);
        }
        return startTimestamp.get();
    }
}
