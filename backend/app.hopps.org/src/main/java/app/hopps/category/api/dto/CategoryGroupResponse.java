package app.hopps.category.api.dto;

import app.hopps.category.domain.CategoryGroup;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * Lightweight view of a category group for lists and the form's applicability check — it never carries the (potentially
 * thousands of) values, only their count. Values are fetched separately via {@code GET /category-groups/{id}/values}.
 */
@Schema(name = "CategoryGroupResponse", description = "A category group without its value list")
public record CategoryGroupResponse(
        Long id,
        String name,
        boolean required,
        List<Long> bommelIds,
        long valueCount) {

    public static CategoryGroupResponse from(CategoryGroup group, long valueCount) {
        List<Long> bommelIds = group.getBommels()
                .stream()
                .map(b -> b.id)
                .toList();
        return new CategoryGroupResponse(group.getId(), group.getName(), group.isRequired(), bommelIds, valueCount);
    }
}
