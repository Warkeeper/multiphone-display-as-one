package com.example.multiphone.controller;

import com.example.multiphone.model.Room;
import com.example.multiphone.model.RoomStatusResponse;
import com.example.multiphone.store.RoomStore;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/rooms")
public class RoomStatusController {

    private final RoomStore roomStore;

    public RoomStatusController(RoomStore roomStore) {
        this.roomStore = roomStore;
    }

    @GetMapping("/{roomId}/status")
    public RoomStatusResponse getStatus(@PathVariable String roomId) {
        Room room = roomStore.findById(roomId);
        if (room == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found");
        }

        long startTimestamp = room.getStartTimestamp();
        return new RoomStatusResponse(
                roomId,
                room.getAssignedCount(),
                room.getReportedReadyCount(),
                room.getDeviceCount(),
                startTimestamp,
                startTimestamp > 0,
                room.getViewportWidthsByDeviceIndex()
        );
    }
}
