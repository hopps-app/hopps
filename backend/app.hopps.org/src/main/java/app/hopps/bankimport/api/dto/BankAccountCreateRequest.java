package app.hopps.bankimport.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request payload for creating a new bank account. {@code name} and {@code iban} are required (see Q2). All other
 * fields are optional. {@code bommelId}, when null, defaults to the organization's root bommel server-side.
 */
public record BankAccountCreateRequest(
        @NotBlank String name,
        @NotBlank @Size(min = 15, max = 34) String iban,
        @Size(max = 11) String bic,
        String bankName,
        String accountHolder,
        @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a 3-letter ISO 4217 code") String currency,
        BigDecimal openingBalance,
        LocalDate openingBalanceDate,
        String description,
        String color,
        Long defaultSchemaId,
        Long bommelId) {
}
