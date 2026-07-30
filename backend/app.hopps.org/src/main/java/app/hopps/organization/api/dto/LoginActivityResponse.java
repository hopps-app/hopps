package app.hopps.organization.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * Payload for the admin activity chart of one organization: gap-free per-day time spent in the application over the
 * chart window, plus the organization's total member count so the chart can relate the total to how many people it is
 * spread across.
 */
@Schema(description = "Per-day time spent in the application by an organization, over the chart window")
public record LoginActivityResponse(
        @Schema(description = "Total members of the organization", examples = "8") int totalMembers,
        @Schema(description = "One entry per day, oldest first, gaps filled with zero") List<DailyActivity> days) {
}
