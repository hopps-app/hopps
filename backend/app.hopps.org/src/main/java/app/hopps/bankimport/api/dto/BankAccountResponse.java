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
        String description,
        String color,
        Long defaultSchemaId,
        String defaultSchemaName,
        boolean archived,
        Instant archivedAt,
        String createdBy,
        Instant createdAt,
        Instant updatedAt) {

    public static BankAccountResponse from(BankAccount account) {
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
