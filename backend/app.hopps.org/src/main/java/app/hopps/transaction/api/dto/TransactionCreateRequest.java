package app.hopps.transaction.api.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request DTO for creating a manual Transaction without a document.
 */
public record TransactionCreateRequest(
        String name,
        @NotNull BigDecimal total,
        BigDecimal totalTax,
        String currencyCode,
        String transactionDate,
        String dueDate,
        Long bommelId,
        Long categoryId,
        String area,
        @NotNull String documentType,
        boolean privatelyPaid,
        String senderName,
        String senderStreet,
        String senderZipCode,
        String senderCity,
        List<String> tags) {
}
