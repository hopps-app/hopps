package app.hopps.organization.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.LocalDate;

/**
 * Activity for a single day: how many distinct members of the organization were active (made an authenticated request)
 * on {@code day}. One entry per day in the requested window, including days with {@code activeUsers == 0}.
 */
@Schema(description = "Distinct active members for a single day")
public record DailyActivity(
        @Schema(description = "The calendar day", examples = "2026-07-05") LocalDate day,
        @Schema(description = "Number of distinct members active that day", examples = "3") long activeUsers) {
}
