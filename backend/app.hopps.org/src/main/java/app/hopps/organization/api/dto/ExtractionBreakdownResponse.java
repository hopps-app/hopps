package app.hopps.organization.api.dto;

import app.hopps.document.domain.ExtractionSource;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.Map;

/**
 * All-time breakdown of one organization's documents (Belege) by how their data was extracted: ZUGFeRD (embedded XML),
 * Azure Document AI, or manual entry. Not windowed — it counts the organization's whole document history. The
 * per-source {@code counts} sum to {@code total}. Documents with no recorded source (never analyzed, never edited) are
 * folded into {@code MANUAL}, so every document is attributed to exactly one method and a source absent from the map
 * means zero.
 */
@Schema(description = "All-time breakdown of an organization's documents by extraction method")
public record ExtractionBreakdownResponse(
        @Schema(description = "Total documents counted — the sum of all per-source counts", examples = "28") long total,
        @Schema(description = "Document count per extraction source; absent sources are zero, null sources are folded into MANUAL") Map<ExtractionSource, Long> counts) {
}
