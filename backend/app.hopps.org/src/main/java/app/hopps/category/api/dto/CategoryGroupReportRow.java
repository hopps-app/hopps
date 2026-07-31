package app.hopps.category.api.dto;

import java.math.BigDecimal;

/**
 * One line of a category-group report: the aggregated income and expense of all transactions carrying {@code value} for
 * the reported group within the requested date range.
 *
 * @param value
 *            the category-group value (e.g. an SKR04 account)
 * @param count
 *            number of transactions carrying this value in the range
 * @param income
 *            sum of positive transaction totals (non-negative)
 * @param expense
 *            magnitude of negative transaction totals (non-negative)
 */
public record CategoryGroupReportRow(String value, long count, BigDecimal income, BigDecimal expense) {
}
