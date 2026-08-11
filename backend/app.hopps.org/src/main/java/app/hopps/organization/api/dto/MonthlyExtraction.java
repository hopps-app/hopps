package app.hopps.organization.api.dto;

import app.hopps.document.domain.ExtractionSource;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.LocalDate;
import java.util.Map;

/**
 * Documents uploaded in one calendar month, split by how their data was extracted. One entry per month in the requested
 * window, including months where nothing was uploaded.
 * <p>
 * Unlike {@link ExtractionBreakdownResponse}, which answers "what does the whole history look like", this is the
 * <em>trend</em>: it shows ZUGFeRD adoption rising or AI usage growing, which a single all-time split cannot. Documents
 * with no recorded source are folded into {@code MANUAL}, exactly as in the all-time breakdown.
 */
@Schema(description = "Documents uploaded in one month, split by extraction method")
public record MonthlyExtraction(
        @Schema(description = "First day of the month", examples = "2026-07-01") LocalDate month,
        @Schema(description = "Document count per extraction source that month; absent sources are zero") Map<ExtractionSource, Long> counts) {
}
