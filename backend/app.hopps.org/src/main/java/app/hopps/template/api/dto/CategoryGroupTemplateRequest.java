package app.hopps.template.api.dto;

import jakarta.validation.constraints.NotBlank;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@Schema(name = "CategoryGroupTemplateRequest", description = "Input for creating or updating a category group template")
public record CategoryGroupTemplateRequest(
        @NotBlank @Schema(description = "Name the group gets when an organization adds it", example = "SKR 49") String name,
        @Schema(description = "Short explanation shown to organizations when they pick a template") String description,
        @Schema(description = "Whether organizations can pick this template") boolean active,
        @Schema(description = "Whether the created group is mandatory before a transaction can be confirmed") boolean required,
        @Schema(description = "The values, in order. Blanks are skipped, duplicates are removed.") List<String> values) {
}
