package app.hopps.bankimport.parser;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import java.io.IOException;
import java.io.StringReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Reads Pleo's expense export ("export_YYYY-MM-DD_YYYY-MM-DD.csv"): one row per expense, with a header row naming the
 * columns. Columns are found by name, so their order does not matter and unknown ones are ignored. Only "Date" and
 * "Amount" are required.
 */
public final class PleoCsvParser {

    static final String DATE = "Date";
    static final String RECEIPT = "Receipt";
    static final String EXPENSE_TYPE = "Expense Type";
    static final String AMOUNT = "Amount";
    static final String CURRENCY = "Currency";
    static final String SOURCE = "Source description";
    static final String CATEGORY = "Category";
    static final String OWNER = "Owner";
    static final String NOTE = "Note";
    static final String EXPENSE_ID = "Expense ID";

    private static final List<String> REQUIRED = List.of(DATE, AMOUNT);

    private static final List<DateTimeFormatter> DATE_FORMATS = java.util.stream.Stream
            .of("dd-MM-uuuu", "dd.MM.uuuu", "uuuu-MM-dd", "dd/MM/uuuu")
            .map(p -> DateTimeFormatter.ofPattern(p).withResolverStyle(java.time.format.ResolverStyle.STRICT))
            .toList();

    /** One expense of the export. {@code rowNumber} counts the file's lines, the header being line 1. */
    public record PleoExpense(
            int rowNumber,
            String expenseId,
            LocalDate date,
            BigDecimal amount,
            String currency,
            String merchant,
            String category,
            String note,
            String receiptNumber,
            String expenseType,
            String owner,
            String rawRow) {
    }

    /** A row that could not be read, with the reason. */
    public record RowError(int rowNumber, String message) {
    }

    public record Result(List<PleoExpense> expenses, List<RowError> errors) {
    }

    /** The file is no Pleo export at all (no header with the required columns). */
    public static class NotAPleoExportException extends RuntimeException {
        private final List<String> missingColumns;

        NotAPleoExportException(List<String> missingColumns) {
            super("Not a Pleo export, missing columns: " + String.join(", ", missingColumns));
            this.missingColumns = missingColumns;
        }

        public List<String> getMissingColumns() {
            return missingColumns;
        }
    }

    private PleoCsvParser() {
    }

    public static Result parse(byte[] content) {
        String text = new String(content, StandardCharsets.UTF_8);
        if (text.startsWith("﻿")) {
            text = text.substring(1);
        }
        char delimiter = detectDelimiter(text);
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setDelimiter(delimiter)
                .setQuote('"')
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreEmptyLines(true)
                .setTrim(false)
                .setAllowMissingColumnNames(true)
                .build();

        List<PleoExpense> expenses = new ArrayList<>();
        List<RowError> errors = new ArrayList<>();
        try (CSVParser parser = format.parse(new StringReader(text))) {
            Map<String, String> columns = columnsByName(parser.getHeaderNames());
            List<String> missing = REQUIRED.stream().filter(c -> !columns.containsKey(norm(c))).toList();
            if (!missing.isEmpty()) {
                throw new NotAPleoExportException(missing);
            }
            for (CSVRecord record : parser) {
                int rowNumber = (int) record.getRecordNumber() + 1;
                try {
                    expenses.add(toExpense(record, columns, rowNumber, delimiter));
                } catch (IllegalArgumentException e) {
                    errors.add(new RowError(rowNumber, e.getMessage()));
                }
            }
        } catch (IOException | java.io.UncheckedIOException e) {
            throw new IllegalArgumentException("The file could not be read as CSV: " + e.getMessage(), e);
        }
        return new Result(expenses, errors);
    }

    private static PleoExpense toExpense(CSVRecord record, Map<String, String> columns, int rowNumber,
            char delimiter) {
        String rawDate = get(record, columns, DATE);
        String rawAmount = get(record, columns, AMOUNT);
        if (rawDate == null) {
            throw new IllegalArgumentException("Date is missing");
        }
        if (rawAmount == null) {
            throw new IllegalArgumentException("Amount is missing");
        }
        LocalDate date = parseDate(rawDate);
        BigDecimal amount = parseAmount(rawAmount);
        String currency = get(record, columns, CURRENCY);
        return new PleoExpense(
                rowNumber,
                get(record, columns, EXPENSE_ID),
                date,
                amount,
                currency != null ? currency.toUpperCase(Locale.ROOT) : null,
                get(record, columns, SOURCE),
                get(record, columns, CATEGORY),
                get(record, columns, NOTE),
                get(record, columns, RECEIPT),
                get(record, columns, EXPENSE_TYPE),
                get(record, columns, OWNER),
                String.join(String.valueOf(delimiter), record.toList()));
    }

    /** The trimmed value of a column, or null when the column is absent or the cell is blank. */
    private static String get(CSVRecord record, Map<String, String> columns, String column) {
        String header = columns.get(norm(column));
        if (header == null || !record.isMapped(header) || !record.isSet(header)) {
            return null;
        }
        String value = record.get(header).trim();
        return value.isEmpty() ? null : value;
    }

    private static Map<String, String> columnsByName(List<String> headerNames) {
        Map<String, String> columns = new HashMap<>();
        for (String header : headerNames) {
            columns.putIfAbsent(norm(header), header);
        }
        return columns;
    }

    private static String norm(String header) {
        return header == null ? "" : header.trim().toLowerCase(Locale.ROOT);
    }

    /** Comma, unless the header line holds more semicolons (exports from some locales). */
    static char detectDelimiter(String text) {
        int end = text.indexOf('\n');
        String header = end < 0 ? text : text.substring(0, end);
        long commas = header.chars().filter(c -> c == ',').count();
        long semicolons = header.chars().filter(c -> c == ';').count();
        return semicolons > commas ? ';' : ',';
    }

    static LocalDate parseDate(String value) {
        for (DateTimeFormatter format : DATE_FORMATS) {
            try {
                return LocalDate.parse(value, format);
            } catch (DateTimeParseException ignored) {
                // try the next one
            }
        }
        throw new IllegalArgumentException("Unreadable date: " + value);
    }

    /**
     * Reads "-1.234,56", "-1,234.56", "656,10" or "17.94": the separator further right is the decimal one; a single
     * kind of separator is decimal unless it is followed by exactly three digits more than once ("1.234.567").
     */
    static BigDecimal parseAmount(String value) {
        String s = value.replace(" ", "").replace(" ", "").replace("€", "");
        int lastComma = s.lastIndexOf(',');
        int lastDot = s.lastIndexOf('.');
        String normalized;
        if (lastComma >= 0 && lastDot >= 0) {
            normalized = lastComma > lastDot
                    ? s.replace(".", "").replace(',', '.')
                    : s.replace(",", "");
        } else if (lastComma >= 0) {
            normalized = s.indexOf(',') != lastComma ? s.replace(",", "") : s.replace(',', '.');
        } else if (lastDot >= 0) {
            normalized = s.indexOf('.') != lastDot ? s.replace(".", "") : s;
        } else {
            normalized = s;
        }
        try {
            return new BigDecimal(normalized);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Unreadable amount: " + value);
        }
    }
}
