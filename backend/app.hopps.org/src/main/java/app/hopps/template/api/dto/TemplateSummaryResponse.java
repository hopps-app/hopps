package app.hopps.template.api.dto;

import app.hopps.template.domain.TemplateType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.Instant;

@Schema(name = "TemplateSummaryResponse", description = "A template as shown in the admin list")
public record TemplateSummaryResponse(
        Long id,
        @Schema(required = true) TemplateType type,
        String name,
        String description,
        boolean active,
        int sortIndex,
        @Schema(description = "Number of items in the template (values for a category group template)") long itemCount,
        @Schema(description = "Number of organizations that currently hold a copy of this template") long usageCount,
        Instant createdAt,
        Instant updatedAt) {
}
