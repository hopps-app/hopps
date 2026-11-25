package app.hopps.bankimport.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * Outcome of importing a Pleo export: what became a movement with its draft booking, and what the category column did.
 */
@Schema(name = "PleoImportResponse", description = "Outcome of a Pleo export import")
public record PleoImportResponse(
        @Schema(description = "The import record, e.g. to take it back") Long importId,
        @Schema(description = "Rows in the file") int totalRows,
        @Schema(description = "Expenses imported, each as a movement with a linked draft booking") int importedRows,
        @Schema(description = "Expenses skipped because they were imported before") int duplicateRows,
        @Schema(description = "Rows that could not be imported") int errorRows,
        @Schema(description = "Imported expenses whose category was found in the chosen group") int categorizedRows,
        @Schema(description = "Imported expenses without a category in the export") int uncategorizedRows,
        @Schema(description = "Categories of the export that the chosen group has no bookable value for") List<String> unknownCategories,
        @Schema(description = "Imported expenses that name a receipt number, so a receipt file can be attached") int awaitingReceiptRows,
        @Schema(description = "Row errors as \"row: message\"") List<String> errors) {
}
