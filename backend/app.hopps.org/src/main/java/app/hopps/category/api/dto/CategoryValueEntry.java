package app.hopps.category.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * One category as a flat list entry, as used by templates and the export file. The parent is referenced by its value:
 * values are unique per group, and a file must not depend on the database ids of the organization it came from.
 */
@Schema(name = "CategoryValueEntry", description = "A category with its parent and settings, as a flat list entry")
public record CategoryValueEntry(
        @Schema(description = "The category's name") String value,
        @Schema(description = "Value of the parent category, or null for a top-level category") String parent,
        @Schema(description = "Whether the category can be booked directly. Defaults to true.") Boolean bookable,
        @Schema(description = "Whether the category is hidden from the pickers. Defaults to false.") Boolean hidden) {

    public CategoryValueEntry {
        value = value == null ? null : value.trim();
        parent = parent == null || parent.isBlank() ? null : parent.trim();
        bookable = bookable == null ? Boolean.TRUE : bookable;
        hidden = hidden == null ? Boolean.FALSE : hidden;
    }

    /** A plain, top-level category with the default settings. */
    public static CategoryValueEntry of(String value) {
        return new CategoryValueEntry(value, null, null, null);
    }
}
