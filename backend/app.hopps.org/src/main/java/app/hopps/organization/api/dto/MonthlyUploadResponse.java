package app.hopps.organization.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * Payload for the admin document-upload activity chart of one organization: the gap-free per-month counts of uploaded
 * documents (Belege) over the reporting window, oldest month first.
 */
@Schema(description = "Per-month document-upload activity for an organization over the reporting window")
public record MonthlyUploadResponse(
        @Schema(description = "One entry per month, oldest first, gaps filled with zero") List<MonthlyCount> months) {
}
