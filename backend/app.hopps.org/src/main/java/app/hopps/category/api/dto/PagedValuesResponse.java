package app.hopps.category.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * A page of category-group values plus the total count matching the (optional) query — feeds the searchable value
 * combobox, which never loads the whole (possibly very large) value set at once.
 */
@Schema(name = "PagedValuesResponse", description = "A page of category-group values with the total match count")
public record PagedValuesResponse(List<CategoryGroupValueResponse> items, long total) {
}
