package app.hopps.category.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(name = "CategoryGroupValueUpdateRequest", description = "A category's position in the hierarchy and its settings")
public record CategoryGroupValueUpdateRequest(
        @Schema(description = "Id of the top-level value to move this one under, or null for the top level") Long parentId,
        @Schema(description = "Whether transactions can carry this value") boolean bookable,
        @Schema(description = "Whether this value is hidden from the pickers for new bookings") boolean hidden) {
}
