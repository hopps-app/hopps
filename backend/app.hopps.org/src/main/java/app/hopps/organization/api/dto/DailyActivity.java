package app.hopps.organization.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.LocalDate;

/**
 * Time spent in the application on a single day, summed across the organization's members. One entry per day in the
 * requested window, including days with {@code activeSeconds == 0}.
 * <p>
 * This is combined member time, so it can exceed 24 hours on a day when several members were active at once. It counts
 * presence rather than output: a member who spends an hour struggling with a form scores higher than one who files a
 * Beleg in two minutes, which is exactly what makes it useful next to the Beleg counts rather than a substitute for
 * them.
 */
@Schema(description = "Time spent in the application on a single day, summed across members")
public record DailyActivity(
        @Schema(description = "The calendar day", examples = "2026-07-05") LocalDate day,
        @Schema(description = "Seconds spent in the application that day, summed across the organization's members", examples = "4320") long activeSeconds) {
}
