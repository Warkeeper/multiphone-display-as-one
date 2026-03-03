package com.example.multiphone.model;

import java.time.Instant;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
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
    private final Map<Integer, DeviceMetrics> readyDeviceMetrics = new ConcurrentHashMap<>();

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

    public int getReportedReadyCount() {
        return readyDeviceMetrics.size();
    }

    public long reportReadyAndMaybeTriggerCountdown(int deviceIndex, int viewportWidth, int viewportHeight,
                                                    int devicePixelRatioTimes100, long delayMillis) {
        if (deviceIndex < 1 || deviceIndex > deviceCount) {
            return startTimestamp.get();
        }

        readyDeviceMetrics.put(deviceIndex, new DeviceMetrics(viewportWidth, viewportHeight, devicePixelRatioTimes100));

        if (assignedCount.get() >= deviceCount && readyDeviceMetrics.size() >= deviceCount) {
            long planned = Instant.now().toEpochMilli() + delayMillis;
            startTimestamp.compareAndSet(0, planned);
        }

        return startTimestamp.get();
    }

    public int[] getViewportWidthsByDeviceIndex() {
        int[] widths = new int[deviceCount];
        Arrays.fill(widths, -1);
        readyDeviceMetrics.forEach((index, metrics) -> {
            if (index >= 1 && index <= deviceCount) {
                widths[index - 1] = metrics.viewportWidth();
            }
        });
        return widths;
    }

    public record DeviceMetrics(int viewportWidth, int viewportHeight, int devicePixelRatioTimes100) {
    }
}
