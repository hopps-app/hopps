package app.hopps.category.api.dto;

import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@Schema(name = "CategoryGroupImportRequest", description = "An export file to bring into the current organization")
public record CategoryGroupImportRequest(
        @NotNull @Schema(description = "The content of the export file") CategoryGroupExport file,
        @Schema(description = "Bommels a new group is assigned to. Ignored when the file extends an existing group.") List<Long> bommelIds,
        @Schema(description = "When true, already-confirmed transactions that would violate a new mandatory group are reset to DRAFT") boolean reopenAffectedTransactions) {
}
