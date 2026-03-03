package com.example.multiphone.controller;

import com.example.multiphone.model.DeviceReadyRequest;
import com.example.multiphone.model.ReadyResponse;
import com.example.multiphone.model.Room;
import com.example.multiphone.store.RoomStore;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/rooms")
public class ReadyController {
    private static final long START_DELAY_MILLIS = 5_000;

    private final RoomStore roomStore;

    public ReadyController(RoomStore roomStore) {
        this.roomStore = roomStore;
    }

    @PostMapping("/{roomId}/ready")
    public ReadyResponse reportReady(@PathVariable String roomId, @Valid @RequestBody DeviceReadyRequest request) {
        Room room = roomStore.findById(roomId);
        if (room == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found");
        }

        int deviceIndex = request.deviceIndex();
        if (deviceIndex > room.getAssignedCount()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Device index has not joined");
        }

        long startTimestamp = room.reportReadyAndMaybeTriggerCountdown(
                deviceIndex,
                request.viewportWidth(),
                request.viewportHeight(),
                request.devicePixelRatioTimes100(),
                START_DELAY_MILLIS
        );

        return new ReadyResponse(room.getReportedReadyCount(), room.getDeviceCount(), startTimestamp);
    }
}
