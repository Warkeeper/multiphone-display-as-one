package com.example.multiphone.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CreateRoomRequest(
        @Min(value = 1, message = "deviceCount must be >= 1") int deviceCount,
        @NotBlank(message = "text is required") String text,
        @Min(value = 1, message = "speed must be >= 1") int speed,
        @Min(value = 1, message = "fontSize must be >= 1") int fontSize,
        @NotBlank(message = "color is required") String color
) {
}
