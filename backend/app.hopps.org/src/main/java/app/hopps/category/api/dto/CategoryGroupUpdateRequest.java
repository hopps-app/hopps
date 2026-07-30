package app.hopps.category.api.dto;

import jakarta.validation.constraints.NotBlank;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * Update of a group's metadata. Values are managed separately via the {@code /values} sub-resource, so they never have
 * to be shipped in bulk here.
 */
@Schema(name = "CategoryGroupUpdateRequest", description = "Input for updating a category group's metadata")
public record CategoryGroupUpdateRequest(
        @NotBlank @Schema(description = "Name of the group") String name,
        @Schema(description = "Whether a value is mandatory before an applicable transaction can be confirmed") boolean required,
        @Schema(description = "Bommels this group is assigned to. Empty = no bommel; assign the root bommel to apply to all.") List<Long> bommelIds,
        @Schema(description = "When true, already-confirmed transactions that would violate the now-mandatory group are reset to DRAFT") boolean reopenAffectedTransactions) {
}
