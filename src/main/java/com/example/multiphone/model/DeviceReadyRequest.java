package com.example.multiphone.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record DeviceReadyRequest(
        @NotNull @Min(1) Integer deviceIndex,
        @NotNull @Min(1) Integer viewportWidth,
        @NotNull @Min(1) Integer viewportHeight,
        @NotNull @Min(1) Integer devicePixelRatioTimes100
) {
}
