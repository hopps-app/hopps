package app.hopps.transaction.api.dto;

import app.hopps.transaction.domain.TransactionCategoryValue;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * A category-group value set on a transaction. {@code groupId} is null for a value whose group has since been deleted
 * (the value is kept for the record and shown as plain text).
 */
@Schema(name = "TransactionCategoryValueResponse", description = "A category-group value stored on a transaction")
public record TransactionCategoryValueResponse(Long groupId, String value) {

    public static TransactionCategoryValueResponse from(TransactionCategoryValue v) {
        return new TransactionCategoryValueResponse(v.getCategoryGroupId(), v.getValue());
    }
}
