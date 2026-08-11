package app.hopps.organization.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.LocalDate;

/**
 * A plain count for one calendar day. One entry per day in the requested window, including days where the count is
 * zero, so a series built from these is gap-free and safe to draw as a continuous line.
 */
@Schema(description = "A count for a single day")
public record DailyCount(
        @Schema(description = "The calendar day", examples = "2026-07-05") LocalDate day,
        @Schema(description = "The count for that day", examples = "12") long count) {
}
