package app.hopps.category.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@Schema(name = "CategoryGroupTemplateDetail", description = "A category group template with all of its values, to pre-fill the create dialog")
public record CategoryGroupTemplateDetail(
        Long id,
        String name,
        String description,
        boolean required,
        List<String> values) {
}
