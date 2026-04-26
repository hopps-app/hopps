package app.hopps.bankimport.api.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request payload for updating a bank account. All fields are optional; only non-null fields are applied (PATCH
 * semantics).
 */
public record BankAccountUpdateRequest(
        String name,
        @Size(min = 15, max = 34) String iban,
        @Size(max = 11) String bic,
        String bankName,
        String accountHolder,
        @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a 3-letter ISO 4217 code") String currency,
        BigDecimal openingBalance,
        LocalDate openingBalanceDate,
        String description,
        String color,
        Long defaultSchemaId) {
}
