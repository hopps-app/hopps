package app.hopps.category.api.dto;

import app.hopps.category.domain.CategoryGroupValue;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(name = "CategoryGroupValueResponse", description = "One allowed value of a category group")
public record CategoryGroupValueResponse(Long id, String value, int sortIndex) {

    public static CategoryGroupValueResponse from(CategoryGroupValue v) {
        return new CategoryGroupValueResponse(v.getId(), v.getValue(), v.getSortIndex());
    }
}
