package app.hopps.org.rest.model;

import jakarta.validation.constraints.NotBlank;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(name = "CategoryInput", description = "Input for creating a new category")
public record CategoryInput(
        @NotBlank
        @Schema(description = "Name of the category", example = "Technology")
        String name,

        @Schema(description = "Description of the category", example = "Category for technology-related items")
        String description
) {
}