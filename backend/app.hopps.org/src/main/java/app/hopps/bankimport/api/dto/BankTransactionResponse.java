package app.hopps.bankimport.api.dto;

import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Response DTO for {@link BankTransaction} list/detail endpoints. Includes account info so the cross-account view can
 * render the colour-coded chip without a second query.
 */
public record BankTransactionResponse(
        Long id,
        Long bankAccountId,
        String bankAccountName,
        String bankAccountColor,
        Long importId,
        LocalDate bookingDate,
        LocalDate valueDate,
        BigDecimal amount,
        String currency,
        String purpose,
        String counterpartyName,
        String counterpartyIban,
        String counterpartyBic,
        String transactionType,
        String bankReference,
        String endToEndReference,
        String mandateReference,
        String creditorId,
        BigDecimal balanceAfter,
        BankTransactionStatus status,
        BigDecimal matchedAmount) {

    public static BankTransactionResponse from(BankTransaction tx) {
        return new BankTransactionResponse(
                tx.getId(),
                tx.getBankAccount() != null ? tx.getBankAccount().getId() : null,
                tx.getBankAccount() != null ? tx.getBankAccount().getName() : null,
                tx.getBankAccount() != null ? tx.getBankAccount().getColor() : null,
                tx.getBankImport() != null ? tx.getBankImport().getId() : null,
                tx.getBookingDate(),
                tx.getValueDate(),
                tx.getAmount(),
                tx.getCurrency(),
                tx.getPurpose(),
                tx.getCounterpartyName(),
                tx.getCounterpartyIban(),
                tx.getCounterpartyBic(),
                tx.getTransactionType(),
                tx.getBankReference(),
                tx.getEndToEndReference(),
                tx.getMandateReference(),
                tx.getCreditorId(),
                tx.getBalanceAfter(),
                tx.getStatus(),
                tx.getMatchedAmount());
    }
}
