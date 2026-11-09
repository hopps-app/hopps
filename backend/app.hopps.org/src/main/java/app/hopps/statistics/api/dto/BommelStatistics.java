package app.hopps.statistics.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * Amounts of a bommel for a period. {@code total}, {@code income} and {@code expenses} are what was booked inside the
 * period. On request ({@code withBalance}) it also carries the balance: {@code carryOver} is the balance at the start
 * of the period (for a year: the balance at the end of the previous one) and {@code balance} the one at its end, so
 * that {@code carryOver + total = balance}. The balance starts from the bommel's opening balance, if it has one.
 */
@Schema(name = "BommelStatistics", description = "Amounts of a bommel for a period, optionally with its balance")
public record BommelStatistics(
        long bommelId,
        String bommelName,
        BigDecimal total,
        BigDecimal income,
        BigDecimal expenses,
        int transactionsCount,
        boolean aggregated,
        @Schema(description = "Balance at the start of the period; only set when the balance was requested") BigDecimal carryOver,
        @Schema(description = "Balance at the end of the period (carryOver + total); only set when the balance was requested") BigDecimal balance) {

    /** Amounts without the balance. */
    public BommelStatistics(long bommelId, String bommelName, BigDecimal total, BigDecimal income, BigDecimal expenses,
            int transactionsCount, boolean aggregated) {
        this(bommelId, bommelName, total, income, expenses, transactionsCount, aggregated, null, null);
    }
}
