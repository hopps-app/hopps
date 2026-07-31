package app.hopps.transaction.api.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

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
        boolean privatelyPaid,
        String senderName,
        String senderStreet,
        String senderZipCode,
        String senderCity,
        List<String> tags,
        // Category-group values keyed by group id. Values for groups not applicable to the bommel are discarded.
        Map<Long, String> categoryValues) {
}
