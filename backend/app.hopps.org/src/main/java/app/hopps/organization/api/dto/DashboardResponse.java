package app.hopps.organization.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * Everything the admin Übersicht shows, in one payload: a row of headline figures over three charts.
 * <p>
 * Deliberately one call rather than several — the tiles are read together, and the headline figures are derived from
 * the same series the charts draw, so splitting them would mean repeating that work per request.
 * <p>
 * Kept to what the page actually renders. Anything the frontend can compute from these series (a month's Beleg total, a
 * share, a month-over-month delta) is not duplicated here.
 */
@Schema(description = "Estate-wide figures for the admin overview")
public record DashboardResponse(
        @Schema(description = "Number of active (non-soft-deleted) organizations", examples = "42") long totalOrganizations,

        @Schema(description = "Organizations that registered per month, oldest first, gaps filled with zero") List<MonthlyCount> signupsPerMonth,

        @Schema(description = "Seconds spent in the application per day across all organizations, oldest first, gaps filled with zero. Combined member time, so a day can exceed 24 hours") List<DailyActivity> activityPerDay,

        @Schema(description = "Distinct organizations with at least one member active on each day, oldest first") List<DailyCount> activeOrganizationsPerDay,

        @Schema(description = "Distinct organizations active at any point in the window. Not the sum or maximum of the per-day counts — an organization active on several days still counts once", examples = "17") long activeOrganizationsInWindow,

        @Schema(description = "Documents uploaded per month split by extraction method, oldest first; every month carries all three sources, missing ones as zero") List<MonthlyExtraction> extractionPerMonth) {
}
