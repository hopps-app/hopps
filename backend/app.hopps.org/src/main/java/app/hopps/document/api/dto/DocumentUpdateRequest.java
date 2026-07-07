package app.hopps.document.api.dto;

import app.hopps.document.domain.DocumentDirection;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request DTO for updating a Document with user-provided data.
 */
public record DocumentUpdateRequest(
        String name,
        BigDecimal total,
        BigDecimal totalTax,
        String currencyCode,
        String transactionDate,
        Long bommelId,
        String senderName,
        String senderStreet,
        String senderZipCode,
        String senderCity,
        boolean privatelyPaid,
        DocumentDirection direction,
        List<String> tags) {
}
