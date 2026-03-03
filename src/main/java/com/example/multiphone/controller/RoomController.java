package com.example.multiphone.controller;

import com.example.multiphone.model.CreateRoomRequest;
import com.example.multiphone.model.CreateRoomResponse;
import com.example.multiphone.model.Room;
import com.example.multiphone.store.RoomStore;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomStore roomStore;

    public RoomController(RoomStore roomStore) {
        this.roomStore = roomStore;
    }

    @PostMapping
    public CreateRoomResponse createRoom(@Valid @RequestBody CreateRoomRequest request) {
        String roomId = UUID.randomUUID().toString().replace("-", "").substring(0, 8);

        Room room = new Room(
                roomId,
                request.deviceCount(),
                request.text(),
                request.speed(),
                request.fontSize(),
                request.color()
        );
        roomStore.save(room);

        // 房间创建时不启动倒计时，startTimestamp=0 表示等待所有设备加入。
        return new CreateRoomResponse(roomId, 0);
    }
}
