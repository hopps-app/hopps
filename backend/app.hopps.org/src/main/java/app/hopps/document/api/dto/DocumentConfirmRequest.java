package app.hopps.document.api.dto;

import java.util.Map;

/**
 * Optional request body for confirming a document: the category-group values that are stored on the transaction created
 * from it.
 */
public record DocumentConfirmRequest(
        // Category-group values keyed by group id. null or empty = none provided.
        Map<Long, String> categoryValues) {
}
