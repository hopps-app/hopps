package app.hopps.organization.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * Payload for the admin LoginActivityChart of one organization: the gap-free per-day active-member counts over the
 * retention window, plus the organization's total member count so the chart can show a ratio (e.g. "3 of 8 active").
 */
@Schema(description = "Per-day login activity for an organization over the retention window")
public record LoginActivityResponse(
        @Schema(description = "Total members of the organization", examples = "8") int totalMembers,
        @Schema(description = "One entry per day, oldest first, gaps filled with zero") List<DailyActivity> days) {
}
