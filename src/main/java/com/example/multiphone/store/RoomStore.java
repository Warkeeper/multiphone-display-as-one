package com.example.multiphone.store;

import com.example.multiphone.model.Room;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RoomStore {
    private final Map<String, Room> rooms = new ConcurrentHashMap<>();

    public void save(Room room) {
        rooms.put(room.getRoomId(), room);
    }

    public Room findById(String roomId) {
        return rooms.get(roomId);
    }
}
