package app.hopps.category.api.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Aggregated report for a single category group: for the requested transaction-date range, the income/expense sums of
 * transactions broken down by the group's recorded values, plus the overall totals.
 *
 * @param groupId
 *            the reported group
 * @param groupName
 *            the group's name (for display)
 * @param startDate
 *            inclusive start of the range (ISO date, or null when unbounded)
 * @param endDate
 *            inclusive end of the range (ISO date, or null when unbounded)
 * @param rows
 *            one row per value, ordered by value
 * @param totalIncome
 *            sum of all rows' income
 * @param totalExpense
 *            sum of all rows' expense
 * @param totalCount
 *            number of transactions across all rows
 */
public record CategoryGroupReportResponse(
        Long groupId,
        String groupName,
        String startDate,
        String endDate,
        List<CategoryGroupReportRow> rows,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        long totalCount) {
}
