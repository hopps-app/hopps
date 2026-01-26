package app.hopps.statistics.api.dto;

import java.math.BigDecimal;

/**
 * Statistics for a specific bommel, optionally including aggregated data from child bommels.
 */
public record BommelStatistics(
        long bommelId,
        String bommelName,
        BigDecimal total,
        BigDecimal income,
        BigDecimal expenses,
        int transactionsCount,
        boolean aggregated) {
}
