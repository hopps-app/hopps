package app.hopps.bankimport.api.dto;

import java.math.BigDecimal;

/**
 * Aggregated totals for a filtered set of bank transactions (cross-account overview, see §5.2 S6).
 * {@code netAmount = sumIncoming + sumOutgoing} (sumOutgoing is already signed negative).
 */
public record BankTransactionAggregateResponse(
        BigDecimal sumIncoming,
        BigDecimal sumOutgoing,
        BigDecimal netAmount,
        long count) {
}
