package app.hopps.bankimport.parser;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import java.io.IOException;
import java.io.StringReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Reads the PayPal activity export ("Aktivitäten herunterladen", CSV, German column headers) and turns it into the
 * movements of one PayPal account in one currency.
 * <p>
 * PayPal writes a movement as several linked rows, so the rows are not booked one to one:
 * <ul>
 * <li><b>Top-ups and withdrawals</b> ("Bankgutschrift auf PayPal-Konto", "Von Nutzer eingeleitete Abbuchung") move
 * money between PayPal and the organization's own bank account. They are kept, so the balance matches PayPal, but
 * marked as {@link Kind#TRANSFER}.</li>
 * <li><b>Fees</b>: a row with an "Entgelt" is booked as its gross amount plus a separate {@link Kind#FEE} movement, so
 * the fee shows up as an expense of its own. Together they add up to the row's net amount.</li>
 * <li><b>Foreign currency</b>: a payment in another currency comes with two "Allgemeine Währungsumrechnung" rows linked
 * through "Zugehöriger Transaktionscode". Only the conversion in the account currency is booked, named after the
 * original payment. Rows in another currency without such a conversion cannot be booked and are reported.</li>
 * </ul>
 * The parser only reads; dedupe and persistence happen in {@code PaypalImportService}.
 */
public final class PaypalCsvParser {

    static final String DATE = "Datum";
    static final String TIME = "Uhrzeit";
    static final String DESCRIPTION = "Beschreibung";
    static final String CURRENCY = "Währung";
    static final String GROSS = "Brutto";
    static final String FEE = "Entgelt";
    static final String NET = "Netto";
    static final String BALANCE = "Guthaben";
    static final String CODE = "Transaktionscode";
    static final String NAME = "Name";
    static final String INVOICE_NUMBER = "Rechnungsnummer";
    static final String RELATED_CODE = "Zugehöriger Transaktionscode";
    /** Optional columns: PayPal only exports them when chosen in the download dialog. */
    static final String SUBJECT = "Betreff";
    static final String NOTE = "Hinweis";

    private static final List<String> REQUIRED_COLUMNS = List.of(DATE, DESCRIPTION, CURRENCY, GROSS, FEE, NET,
            BALANCE, CODE, NAME, RELATED_CODE);

    /** Column headers of the English export, to tell the user to switch the language instead of failing silently. */
    private static final List<String> ENGLISH_SIGNATURE = List.of("Gross", "Fee", "Net", "Transaction ID",
            "Reference Txn ID");

    /** Descriptions of movements between PayPal and the organization's own bank account. */
    private static final Set<String> TRANSFER_DESCRIPTIONS = Set.of(
            "bankgutschrift auf paypal-konto",
            "von nutzer eingeleitete abbuchung",
            "allgemeine abbuchung",
            "abbuchung auf bankkonto");

    private static final String CONVERSION_DESCRIPTION = "allgemeine währungsumrechnung";

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final char BOM = '﻿';

    private PaypalCsvParser() {
    }

    /** What a booked movement is, see the class comment. */
    public enum Kind {
        PAYMENT,
        FEE,
        TRANSFER
    }

    /**
     * One movement to book.
     *
     * @param key
     *            stable, unique key of the movement within PayPal: the transaction code, with a suffix for the fee
     * @param balanceAfter
     *            the PayPal balance right after this movement
     */
    public record Entry(
            int rowNumber,
            Kind kind,
            String key,
            LocalDate bookingDate,
            BigDecimal amount,
            String currency,
            String purpose,
            String counterpartyName,
            String transactionType,
            String transactionCode,
            BigDecimal balanceAfter,
            String rawRow) {
    }

    /** A row that cannot be booked, with the reason in German (shown in the import report). */
    public record Problem(int rowNumber, String rawRow, String message) {
    }

    public record Result(List<Entry> entries, List<Problem> problems, Set<String> currencies) {
    }

    /** True when the file starts with the header line of a PayPal activity export (German or English). */
    public static boolean isPaypal(byte[] content) {
        List<String> header = readHeader(new String(content, 0, Math.min(content.length, 4096),
                StandardCharsets.UTF_8));
        return isGermanHeader(header) || isEnglishHeader(header);
    }

    /** True when the PayPal export has English column headers, which are not supported yet. */
    public static boolean isEnglishHeader(List<String> header) {
        return header.containsAll(ENGLISH_SIGNATURE);
    }

    private static boolean isGermanHeader(List<String> header) {
        return header.containsAll(REQUIRED_COLUMNS);
    }

    /** The currencies in the file, without reading any further. Used to check the file against the account. */
    public static Set<String> currencies(String text) {
        Set<String> currencies = new HashSet<>();
        for (Row row : readRows(text)) {
            if (row.currency != null) {
                currencies.add(row.currency);
            }
        }
        return currencies;
    }

    /**
     * Reads the export and returns the movements in {@code accountCurrency}, in booking order.
     *
     * @throws IllegalArgumentException
     *             if the file is not a German PayPal activity export
     */
    public static Result parse(String text, String accountCurrency) {
        List<Row> rows = readRows(text);
        String currency = accountCurrency.toUpperCase(Locale.ROOT);

        Map<String, Row> byCode = new HashMap<>();
        Set<String> currencies = new HashSet<>();
        for (Row row : rows) {
            if (row.code != null) {
                byCode.putIfAbsent(row.code, row);
            }
            if (row.currency != null) {
                currencies.add(row.currency);
            }
        }

        // The original payments behind a conversion into the account currency: their rows in the foreign currency are
        // booked through that conversion and are not reported.
        Set<String> convertedCodes = new HashSet<>();
        for (Row row : rows) {
            if (currency.equals(row.currency) && row.isConversion() && row.relatedCode != null) {
                convertedCodes.add(row.relatedCode);
            }
        }

        List<Entry> entries = new ArrayList<>();
        List<Problem> problems = new ArrayList<>();
        // PayPal appends the rows of foreign-currency payments at the end of the file; book in time order.
        List<Row> ordered = new ArrayList<>(rows);
        ordered.sort(Comparator.comparing((Row r) -> r.date, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(r -> r.time, Comparator.nullsLast(Comparator.naturalOrder())));

        for (Row row : ordered) {
            if (row.error != null) {
                problems.add(new Problem(row.rowNumber, row.raw, row.error));
                continue;
            }
            if (!currency.equals(row.currency)) {
                boolean converted = convertedCodes.contains(row.code) || convertedCodes.contains(row.relatedCode);
                if (!converted) {
                    problems.add(new Problem(row.rowNumber, row.raw, "Betrag in " + row.currency
                            + " ohne Umrechnung in " + currency + ", nicht importiert"));
                }
                continue;
            }
            book(row, byCode, entries);
        }
        return new Result(entries, problems, currencies);
    }

    private static void book(Row row, Map<String, Row> byCode, List<Entry> entries) {
        if (row.isTransfer()) {
            entries.add(entry(row, Kind.TRANSFER, row.code, row.gross, row.description, null, row.balance));
            return;
        }

        // A conversion into the account currency stands for the payment in the foreign currency: take its name and
        // purpose from there.
        Row source = row;
        if (row.isConversion() && row.relatedCode != null && byCode.containsKey(row.relatedCode)) {
            source = byCode.get(row.relatedCode);
        }
        String purpose = purposeOf(source);
        if (source != row) {
            // The foreign amount including PayPal's fee there: that is what the conversion paid for.
            BigDecimal foreignNet = source.gross.add(source.fee).abs();
            purpose = purpose + " (" + foreignNet.toPlainString().replace('.', ',') + " " + source.currency + ")";
        }

        boolean hasFee = row.fee.signum() != 0;
        // The balance after the gross amount, before the fee is taken.
        BigDecimal balanceAfterGross = row.balance == null ? null : row.balance.subtract(row.fee);
        entries.add(entry(row, Kind.PAYMENT, row.code, row.gross, purpose, source.name,
                hasFee ? balanceAfterGross : row.balance));
        if (hasFee) {
            entries.add(entry(row, Kind.FEE, row.code + ":fee", row.fee, "PayPal-Entgelt zu " + row.code, "PayPal",
                    row.balance));
        }
    }

    private static Entry entry(Row row, Kind kind, String key, BigDecimal amount, String purpose,
            String counterpartyName, BigDecimal balanceAfter) {
        return new Entry(row.rowNumber, kind, key, row.date, amount, row.currency, purpose, counterpartyName,
                row.description, row.code, balanceAfter, row.raw);
    }

    /** Subject and note when exported, the invoice number, and the PayPal description when there is nothing else. */
    private static String purposeOf(Row row) {
        List<String> parts = new ArrayList<>();
        addIfPresent(parts, row.subject);
        if (row.note != null && !row.note.equals(row.subject)) {
            parts.add(row.note);
        }
        if (row.invoiceNumber != null) {
            parts.add("Rechnungsnr. " + row.invoiceNumber);
        }
        if (parts.isEmpty()) {
            return row.description;
        }
        return String.join(" · ", parts);
    }

    private static void addIfPresent(List<String> parts, String value) {
        if (value != null) {
            parts.add(value);
        }
    }

    // -------------------------------------------------------------------------------------------------------------
    // Reading the CSV
    // -------------------------------------------------------------------------------------------------------------

    private static List<Row> readRows(String text) {
        String clean = stripBom(text);
        List<Row> rows = new ArrayList<>();
        try (CSVParser parser = CSVFormat.DEFAULT.builder()
                .setDelimiter(',')
                .setQuote('"')
                .setIgnoreEmptyLines(true)
                .setAllowMissingColumnNames(true)
                .build()
                .parse(new StringReader(clean))) {
            Map<String, Integer> columns = null;
            int lineNumber = 0;
            for (CSVRecord record : parser) {
                lineNumber++;
                List<String> values = record.toList();
                if (columns == null) {
                    List<String> header = values.stream().map(String::trim).toList();
                    if (isEnglishHeader(header)) {
                        throw new IllegalArgumentException("Der PayPal-Export hat englische Spaltennamen. Bitte die "
                                + "Aktivitäten mit Sprache Deutsch herunterladen.");
                    }
                    if (!isGermanHeader(header)) {
                        throw new IllegalArgumentException("Die Datei ist kein PayPal-Aktivitätenexport");
                    }
                    columns = new HashMap<>();
                    for (int i = 0; i < header.size(); i++) {
                        columns.putIfAbsent(header.get(i), i);
                    }
                    continue;
                }
                rows.add(Row.read(lineNumber, values, columns));
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("PayPal-Export konnte nicht gelesen werden: " + e.getMessage(), e);
        }
        return rows;
    }

    private static List<String> readHeader(String text) {
        String clean = stripBom(text);
        int end = clean.indexOf('\n');
        String firstLine = end < 0 ? clean : clean.substring(0, end);
        try (CSVParser parser = CSVFormat.DEFAULT.builder()
                .setDelimiter(',')
                .setQuote('"')
                .build()
                .parse(new StringReader(firstLine))) {
            for (CSVRecord record : parser) {
                return record.toList().stream().map(String::trim).toList();
            }
        } catch (IOException | RuntimeException e) {
            return List.of();
        }
        return List.of();
    }

    private static String stripBom(String text) {
        return !text.isEmpty() && text.charAt(0) == BOM ? text.substring(1) : text;
    }

    /** One line of the export. {@code error} is set when a required value cannot be read. */
    private static final class Row {
        int rowNumber;
        String raw;
        String error;
        LocalDate date;
        LocalTime time;
        String description;
        String currency;
        BigDecimal gross;
        BigDecimal fee;
        BigDecimal balance;
        String code;
        String name;
        String invoiceNumber;
        String relatedCode;
        String subject;
        String note;

        static Row read(int rowNumber, List<String> values, Map<String, Integer> columns) {
            Row row = new Row();
            row.rowNumber = rowNumber;
            row.raw = String.join(";", values);
            try {
                row.date = LocalDate.parse(require(values, columns, DATE), DATE_FORMAT);
                String time = value(values, columns, TIME);
                row.time = time == null ? null : LocalTime.parse(time);
                row.description = require(values, columns, DESCRIPTION);
                row.currency = require(values, columns, CURRENCY).toUpperCase(Locale.ROOT);
                row.gross = amount(require(values, columns, GROSS));
                String fee = value(values, columns, FEE);
                row.fee = fee == null ? BigDecimal.ZERO : amount(fee);
                String balance = value(values, columns, BALANCE);
                row.balance = balance == null ? null : amount(balance);
                row.code = require(values, columns, CODE);
                row.name = value(values, columns, NAME);
                row.invoiceNumber = value(values, columns, INVOICE_NUMBER);
                row.relatedCode = value(values, columns, RELATED_CODE);
                row.subject = value(values, columns, SUBJECT);
                row.note = value(values, columns, NOTE);
            } catch (DateTimeParseException e) {
                row.error = "Datum oder Uhrzeit nicht lesbar: " + e.getParsedString();
            } catch (IllegalArgumentException e) {
                row.error = e.getMessage();
            }
            return row;
        }

        boolean isTransfer() {
            return TRANSFER_DESCRIPTIONS.contains(description.toLowerCase(Locale.ROOT));
        }

        boolean isConversion() {
            return CONVERSION_DESCRIPTION.equals(description.toLowerCase(Locale.ROOT));
        }

        private static BigDecimal amount(String value) {
            return DateAmountParser.parseAmount(value, ',', '.');
        }

        private static String require(List<String> values, Map<String, Integer> columns, String column) {
            String value = value(values, columns, column);
            if (value == null) {
                throw new IllegalArgumentException("Spalte \"" + column + "\" ist leer");
            }
            return value;
        }

        private static String value(List<String> values, Map<String, Integer> columns, String column) {
            Integer index = columns.get(column);
            if (index == null || index >= values.size()) {
                return null;
            }
            String value = values.get(index).trim();
            return value.isEmpty() ? null : value;
        }
    }
}
