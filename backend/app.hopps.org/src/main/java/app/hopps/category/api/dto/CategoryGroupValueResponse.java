package app.hopps.category.api.dto;

import app.hopps.category.domain.CategoryGroupValue;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(name = "CategoryGroupValueResponse", description = "One allowed value of a category group")
public record CategoryGroupValueResponse(
        Long id,
        String value,
        int sortIndex,
        @Schema(description = "Id of the parent value, or null for a top-level value") Long parentId,
        @Schema(description = "Name of the parent value, or null for a top-level value") String parentValue,
        @Schema(description = "Whether transactions can carry this value. False for a parent that only collects its children.") boolean bookable,
        @Schema(description = "Whether this value itself is hidden") boolean hidden,
        @Schema(description = "Whether this value is hidden through its parent") boolean parentHidden,
        @Schema(description = "Whether a new booking can use this value") boolean selectable,
        @Schema(description = "Number of values below this one") long childCount) {
    public static CategoryGroupValueResponse from(CategoryGroupValue v, long childCount) {
        CategoryGroupValue parent = v.getParent();
        return new CategoryGroupValueResponse(v.getId(), v.getValue(), v.getSortIndex(),
                parent == null ? null : parent.getId(), parent == null ? null : parent.getValue(),
                v.isBookable(), v.isHidden(), v.isParentHidden(), v.isSelectable(), childCount);
    }
}
