package app.hopps.bankimport.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Result of automatic schema detection from CSV header columns. {@code type} indicates what was matched:
 * <ul>
 * <li>{@code ORG} – an existing org-owned {@link app.hopps.bankimport.domain.BankCsvSchema} matched.</li>
 * <li>{@code TEMPLATE} – a built-in system template matched; use {@code templateId} to start an import.</li>
 * <li>{@code NONE} – no schema matched; the user must select or create one manually.</li>
 * </ul>
 */
public record SchemaDetectionResult(
        @Schema(description = "Type of match found") DetectionType type,
        @Schema(description = "ID of the matched org schema (only set when type=ORG)") Long schemaId,
        @Schema(description = "Template ID of the matched system template (only set when type=TEMPLATE)") String templateId,
        @Schema(description = "Human-readable name of the matched schema or template") String name,
        @Schema(description = "Confidence score between 0.0 and 1.0") double confidence) {

    public enum DetectionType {
        ORG, TEMPLATE, NONE
    }

    public static SchemaDetectionResult none() {
        return new SchemaDetectionResult(DetectionType.NONE, null, null, null, 0.0);
    }
}
