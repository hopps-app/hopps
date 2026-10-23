package app.hopps.template.api.dto;

import app.hopps.template.domain.CategoryGroupTemplate;
import app.hopps.template.domain.TemplateCategoryValue;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

@Schema(name = "CategoryGroupTemplateResponse", description = "A category group template with all of its values, for editing in the admin app")
public record CategoryGroupTemplateResponse(
        Long id,
        String name,
        String description,
        boolean active,
        int sortIndex,
        boolean required,
        List<String> values,
        @Schema(description = "Number of organizations that currently hold a copy of this template") long usageCount,
        Instant createdAt,
        Instant updatedAt) {

    public static CategoryGroupTemplateResponse from(CategoryGroupTemplate template, long usageCount) {
        return new CategoryGroupTemplateResponse(
                template.getId(),
                template.getName(),
                template.getDescription(),
                template.isActive(),
                template.getSortIndex(),
                template.isRequired(),
                template.getValues().stream().map(TemplateCategoryValue::getValue).toList(),
                usageCount,
                template.getCreatedAt(),
                template.getUpdatedAt());
    }
}
