package app.hopps.category.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@Schema(name = "CategoryGroupTemplateOption", description = "A template the organization can add as a category group")
public record CategoryGroupTemplateOption(
        Long id,
        String name,
        String description,
        boolean required,
        long valueCount,
        @Schema(description = "The first few values, as a preview") List<String> previewValues,
        @Schema(description = "Id of a group the organization already created from this template, or null if it was never used") Long addedGroupId) {
}
