package app.hopps.category.api.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * One line of a category-group report: the aggregated income and expense of all transactions carrying {@code value} for
 * the reported group within the requested date range. A row with children sums them up.
 *
 * @param value
 *            the category-group value (e.g. an SKR04 account)
 * @param count
 *            number of transactions carrying this value in the range
 * @param income
 *            sum of positive transaction totals (non-negative)
 * @param expense
 *            magnitude of negative transaction totals (non-negative)
 * @param direct
 *            true for the child row holding what was booked directly on a parent with children
 * @param children
 *            the rows of the child categories, empty for a value without children
 */
public record CategoryGroupReportRow(String value, long count, BigDecimal income, BigDecimal expense, boolean direct,
        List<CategoryGroupReportRow> children) {
}
