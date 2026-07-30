package app.hopps.category.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * The pending (not-yet-saved) state of a group, used to preview how many already-confirmed transactions would be
 * affected if the group became mandatory for these bommels.
 */
@Schema(name = "ReopenImpactRequest", description = "Pending group state to preview the re-draft impact")
public record ReopenImpactRequest(
        @Schema(description = "Existing group id, or null when previewing a group that is being created") Long id,
        @Schema(description = "Whether the group would be mandatory") boolean required,
        @Schema(description = "Bommels the group would be assigned to") List<Long> bommelIds) {
}
