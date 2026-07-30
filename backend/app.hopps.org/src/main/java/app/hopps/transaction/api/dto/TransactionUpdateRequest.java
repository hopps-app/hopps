package app.hopps.transaction.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Request DTO for updating a Transaction with user-provided data.
 */
public record TransactionUpdateRequest(
        String name,
        BigDecimal total,
        BigDecimal totalTax,
        String currencyCode,
        String transactionDate,
        String dueDate,
        Long bommelId,
        boolean privatelyPaid,
        String senderName,
        String senderStreet,
        String senderZipCode,
        String senderCity,
        List<String> tags,
        String status,
        // Category-group values keyed by group id. null = leave unchanged; empty map = clear all.
        Map<Long, String> categoryValues) {
}
