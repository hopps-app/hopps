package app.hopps.bankimport.api.dto;

import app.hopps.bankimport.domain.BankAccount;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Response DTO for {@link BankAccount} operations.
 */
public record BankAccountResponse(
        Long id,
        Long organizationId,
        Long bommelId,
        String bommelName,
        String name,
        String iban,
        String bic,
        String bankName,
        String accountHolder,
        String currency,
        BigDecimal openingBalance,
        LocalDate openingBalanceDate,
        BigDecimal balance,
        String description,
        String color,
        Long defaultSchemaId,
        String defaultSchemaName,
        boolean archived,
        Instant archivedAt,
        String createdBy,
        Instant createdAt,
        Instant updatedAt) {

    /**
     * @param balance
     *            the computed current balance (opening balance + transactions booked after the opening date); pass
     *            {@code null} when the balance is not relevant (it then falls back to the opening balance).
     */
    public static BankAccountResponse from(BankAccount account, BigDecimal balance) {
        return new BankAccountResponse(
                account.getId(),
                account.getOrganization() != null ? account.getOrganization().id : null,
                account.getBommel() != null ? account.getBommel().id : null,
                account.getBommel() != null ? account.getBommel().getName() : null,
                account.getName(),
                account.getIban(),
                account.getBic(),
                account.getBankName(),
                account.getAccountHolder(),
                account.getCurrency(),
                account.getOpeningBalance(),
                account.getOpeningBalanceDate(),
                balance != null ? balance : account.getOpeningBalance(),
                account.getDescription(),
                account.getColor(),
                account.getDefaultSchema() != null ? account.getDefaultSchema().getId() : null,
                account.getDefaultSchema() != null ? account.getDefaultSchema().getName() : null,
                account.isArchived(),
                account.getArchivedAt(),
                account.getCreatedBy(),
                account.getCreatedAt(),
                account.getUpdatedAt());
    }
}
