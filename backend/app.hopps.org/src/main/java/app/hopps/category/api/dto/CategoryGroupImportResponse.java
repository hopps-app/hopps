package app.hopps.category.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(name = "CategoryGroupImportResponse", description = "The outcome of an import")
public record CategoryGroupImportResponse(
        CategoryGroupResponse group,
        @Schema(description = "True when a new group was created, false when the file extended an existing one") boolean created,
        @Schema(description = "Number of categories added") int addedValues) {
}
