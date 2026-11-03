package app.hopps.category.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * The export file of a category group. Bommel assignments are not part of it, they only mean something within one
 * organization.
 */
@Schema(name = "CategoryGroupExport", description = "A category group as a portable file")
public record CategoryGroupExport(
        @Schema(description = "Version of this format") int formatVersion,
        @Schema(description = "Stable id of the source. Importing a file with a known key extends the existing group.") String sourceKey,
        String name,
        boolean required,
        List<CategoryValueEntry> values) {

    public static final int FORMAT_VERSION = 1;
}
