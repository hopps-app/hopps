package app.hopps.category.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@Schema(name = "CategoryGroupValueCreateRequest", description = "Values to add to a category group")
public record CategoryGroupValueCreateRequest(
        @Schema(description = "Values to add; duplicates within the group are ignored") List<String> values) {
}
