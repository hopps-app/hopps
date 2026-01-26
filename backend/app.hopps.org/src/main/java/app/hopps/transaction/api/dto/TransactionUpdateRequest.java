package app.hopps.transaction.api.dto;

import java.math.BigDecimal;
import java.util.List;

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
        Long categoryId,
        String area,
        String documentType,
        boolean privatelyPaid,
        String senderName,
        String senderStreet,
        String senderZipCode,
        String senderCity,
        List<String> tags) {
}
