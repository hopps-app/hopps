package app.hopps.organization.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.LocalDate;

/**
 * Activity for a single day: the total number of activity events across the organization's members on {@code day} (the
 * sum of each member's throttled activity count, not distinct members). One entry per day in the requested window,
 * including days with {@code activityCount == 0}.
 */
@Schema(description = "Total activity events for a single day")
public record DailyActivity(
        @Schema(description = "The calendar day", examples = "2026-07-05") LocalDate day,
        @Schema(description = "Total activity events that day (summed across members)", examples = "12") long activityCount) {
}
