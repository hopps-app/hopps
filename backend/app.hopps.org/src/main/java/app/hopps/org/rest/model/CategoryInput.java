package app.hopps.org.rest.model;

import jakarta.validation.constraints.NotBlank;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.hibernate.validator.constraints.Length;

@Schema(name = "CategoryInput", description = "Input for creating a new category")
public record CategoryInput(
        @NotBlank @Length(min = 1, max = 127) @Schema(description = "Name of the category", example = "Technology") String name,

        @Length(max = 255) @Schema(description = "Description of the category", example = "Category for technology-related items") String description) {
}
