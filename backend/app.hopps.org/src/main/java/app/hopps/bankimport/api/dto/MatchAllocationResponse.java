package app.hopps.bankimport.api.dto;

import java.math.BigDecimal;

/**
 * The allocation (used amount) of a single bank-transaction ↔ bookkeeping-transaction match, keyed by the bookkeeping
 * transaction. Returned per bank transaction so the reconciliation UI can show and edit how much of the movement each
 * linked transaction consumed.
 */
public record MatchAllocationResponse(
        Long transactionId,
        BigDecimal amount) {
}
