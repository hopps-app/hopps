package app.hopps.bankimport.parser;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoField;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Parses dates and decimal amounts from CSV cells. Handles two-digit years via a configurable pivot year (Sparkasse
 * exports use {@code dd.MM.yy} — see bank-import-feature.md §2.3).
 */
public final class DateAmountParser {

    /**
     * Years &lt; pivot are 21st century, &gt;= pivot stays in 20th. Default 2050: {@code 49 → 2049}, {@code 50 → 1950}.
     */
    public static final int DEFAULT_PIVOT_YEAR = 2050;

    private static final Map<String, DateTimeFormatter> FORMATTER_CACHE = new HashMap<>();

    private DateAmountParser() {
    }

    public static LocalDate parseDate(String value, String pattern) {
        return parseDate(value, pattern, DEFAULT_PIVOT_YEAR);
    }

    public static LocalDate parseDate(String value, String pattern, int pivotYear) {
        if (value == null) {
            throw new IllegalArgumentException("Date value is null");
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Date value is empty");
        }
        DateTimeFormatter formatter = formatterFor(pattern, pivotYear);
        try {
            return LocalDate.parse(trimmed, formatter);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(
                    "Cannot parse '" + trimmed + "' as date with pattern '" + pattern + "'", e);
        }
    }

    private static DateTimeFormatter formatterFor(String pattern, int pivotYear) {
        if (pattern == null || pattern.isBlank()) {
            throw new IllegalArgumentException("Date pattern is blank");
        }
        // Patterns containing a 2-digit year ("yy" but not "yyyy") need a pivot. Build a custom formatter once.
        boolean hasTwoDigitYear = pattern.contains("yy") && !pattern.contains("yyyy");
        String cacheKey = pattern + "|" + (hasTwoDigitYear ? pivotYear : "default");
        DateTimeFormatter cached = FORMATTER_CACHE.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        DateTimeFormatter formatter = hasTwoDigitYear
                ? buildFormatterWithPivot(pattern, pivotYear)
                : DateTimeFormatter.ofPattern(pattern, Locale.GERMAN);
        FORMATTER_CACHE.put(cacheKey, formatter);
        return formatter;
    }

    /**
     * Constructs a {@link DateTimeFormatter} for a pattern that contains a 2-digit {@code yy}, replacing it with a
     * pivot-aware reduced-value year. Non-year segments are emitted as a single {@code appendPattern} call so that
     * consecutive letter runs (e.g. {@code dd}) are treated as one fixed-width field rather than two greedy ones.
     */
    private static DateTimeFormatter buildFormatterWithPivot(String pattern, int pivotYear) {
        DateTimeFormatterBuilder builder = new DateTimeFormatterBuilder();
        int baseYear = pivotYear - 100;
        int i = 0;
        int segStart = 0;
        boolean inQuote = false;
        while (i < pattern.length()) {
            char c = pattern.charAt(i);
            if (inQuote) {
                if (c == '\'') {
                    inQuote = false;
                }
                i++;
            } else if (c == '\'') {
                inQuote = true;
                i++;
            } else if (c == 'y') {
                if (i > segStart) {
                    builder.appendPattern(pattern.substring(segStart, i));
                }
                int j = i;
                while (j < pattern.length() && pattern.charAt(j) == 'y') {
                    j++;
                }
                int len = j - i;
                if (len == 2) {
                    builder.appendValueReduced(ChronoField.YEAR, 2, 2, baseYear);
                } else {
                    builder.appendPattern("y".repeat(len));
                }
                i = j;
                segStart = j;
            } else {
                i++;
            }
        }
        if (i > segStart) {
            builder.appendPattern(pattern.substring(segStart, i));
        }
        return builder.toFormatter(Locale.GERMAN);
    }

    /**
     * Parses an amount string. Handles the common German format ({@code 1.234,56} → 1234.56) and US format
     * ({@code 1,234.56}). Sign is preserved if present in the value.
     */
    public static BigDecimal parseAmount(String value, char decimalSeparator, Character thousandSeparator) {
        if (value == null) {
            throw new IllegalArgumentException("Amount value is null");
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Amount value is empty");
        }
        StringBuilder normalized = new StringBuilder(trimmed.length());
        for (int i = 0; i < trimmed.length(); i++) {
            char c = trimmed.charAt(i);
            if (thousandSeparator != null && c == thousandSeparator) {
                continue;
            }
            if (c == decimalSeparator) {
                normalized.append('.');
            } else if (c == '+' || c == '-' || Character.isDigit(c) || c == '.') {
                normalized.append(c);
            } else if (Character.isWhitespace(c) || c == ' ') {
                // ignore embedded whitespace / non-breaking space
            } else {
                throw new IllegalArgumentException(
                        "Unexpected character '" + c + "' while parsing amount '" + trimmed + "'");
            }
        }
        try {
            return new BigDecimal(normalized.toString());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Cannot parse '" + trimmed + "' as amount", e);
        }
    }
}
