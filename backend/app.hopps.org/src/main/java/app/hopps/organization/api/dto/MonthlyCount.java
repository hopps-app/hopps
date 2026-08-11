package app.hopps.organization.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.LocalDate;

/**
 * Number of uploaded documents (Belege) for a single calendar month. One entry per month in the requested window,
 * including months with {@code count == 0}. The {@code month} is the first day of that month.
 */
@Schema(description = "Uploaded documents for a single month")
public record MonthlyCount(
        @Schema(description = "First day of the month", examples = "2026-07-01") LocalDate month,
        @Schema(description = "Number of documents uploaded that month", examples = "12") long count) {
}
