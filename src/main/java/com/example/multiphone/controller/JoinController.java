package com.example.multiphone.controller;

import com.example.multiphone.model.JoinResponse;
import com.example.multiphone.model.Room;
import com.example.multiphone.store.RoomStore;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class JoinController {

    private final RoomStore roomStore;

    public JoinController(RoomStore roomStore) {
        this.roomStore = roomStore;
    }

    @GetMapping("/join")
    public JoinResponse join(@RequestParam String roomId) {
        Room room = roomStore.findById(roomId);
        if (room == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found");
        }

        int deviceIndex = room.tryAllocateDeviceIndex();
        if (deviceIndex < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Room is full");
        }

        return new JoinResponse(
                deviceIndex,
                room.getDeviceCount(),
                room.getText(),
                room.getSpeed(),
                room.getFontSize(),
                room.getColor(),
                room.getStartTimestamp()
        );
    }
}
