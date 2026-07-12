package app.hopps.organization.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * Payload for the admin activity chart of one organization: the gap-free per-day activity event counts over the
 * retention window, plus the organization's total member count so the chart can show a ratio (e.g. "12 activity events,
 * 8 members").
 */
@Schema(description = "Per-day login activity for an organization over the retention window")
public record LoginActivityResponse(
        @Schema(description = "Total members of the organization", examples = "8") int totalMembers,
        @Schema(description = "One entry per day, oldest first, gaps filled with zero") List<DailyActivity> days) {
}
