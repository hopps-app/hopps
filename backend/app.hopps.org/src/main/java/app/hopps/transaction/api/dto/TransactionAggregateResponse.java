package app.hopps.transaction.api.dto;

import java.math.BigDecimal;

/**
 * Aggregated totals for a filtered set of transactions, for the paged overview: how many transactions match the filter
 * (drives paging) and the income/expense sums across the whole result set (not just the current page).
 * {@code sumIncome} is the sum of positive totals, {@code sumExpense} the magnitude of negative totals (both
 * non-negative); {@code count} is the total number of matching transactions.
 */
public record TransactionAggregateResponse(
        BigDecimal sumIncome,
        BigDecimal sumExpense,
        long count) {
}
