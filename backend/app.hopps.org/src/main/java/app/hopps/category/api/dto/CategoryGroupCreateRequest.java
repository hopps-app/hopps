package app.hopps.category.api.dto;

import jakarta.validation.constraints.NotBlank;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@Schema(name = "CategoryGroupCreateRequest", description = "Input for creating a category group")
public record CategoryGroupCreateRequest(
        @NotBlank @Schema(description = "Name of the group", example = "Kostenstelle") String name,
        @Schema(description = "Whether a value is mandatory before an applicable transaction can be confirmed") boolean required,
        @Schema(description = "Bommels this group is assigned to. Empty = no bommel; assign the root bommel to apply to all.") List<Long> bommelIds,
        @Schema(description = "Initial allowed values (order preserved)") List<String> values,
        @Schema(description = "When true, already-confirmed transactions that would violate the now-mandatory group are reset to DRAFT") boolean reopenAffectedTransactions) {
}
