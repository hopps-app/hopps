package app.hopps.category.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * How widely a category group is used — the number of transactions (draft or confirmed) that carry a value for it. Used
 * to warn before deletion.
 */
@Schema(name = "CategoryGroupUsageResponse", description = "Usage count of a category group")
public record CategoryGroupUsageResponse(long transactionCount) {
}
