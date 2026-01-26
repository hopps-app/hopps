package app.hopps.statistics.api.dto;

import java.math.BigDecimal;

/**
 * Statistics for the entire organization.
 */
public record OrganizationStatistics(
        int totalBommels,
        int transactionsCount,
        BigDecimal total,
        BigDecimal income,
        BigDecimal expenses) {
}
