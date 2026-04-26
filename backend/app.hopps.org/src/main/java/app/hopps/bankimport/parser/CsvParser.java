package app.hopps.bankimport.parser;

import app.hopps.bankimport.domain.BankCsvSchema;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;

/**
 * Thin wrapper around Apache Commons CSV that applies a {@link BankCsvSchema} (delimiter, quote, header, skip lines) to
 * a decoded text input and yields raw row data. Field-level interpretation (mapping → typed values) lives in
 * {@code CsvImportService}.
 */
public final class CsvParser {

    private CsvParser() {
    }

    /** Parses a single line of CSV using the schema's dialect. Used to split header rows for preview. */
    public static List<String> parseSingleLine(String line, BankCsvSchema schema) {
        try (CSVParser parser = buildFormat(schema, false)
                .parse(new StringReader(line))) {
            for (CSVRecord record : parser) {
                List<String> values = new ArrayList<>(record.size());
                for (int i = 0; i < record.size(); i++) {
                    values.add(record.get(i));
                }
                return values;
            }
            return List.of();
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to parse CSV line: " + e.getMessage(), e);
        }
    }

    /**
     * Parses the full text input and returns each row as a list of strings. Lines configured via
     * {@code skipLines}/{@code hasHeader} are honoured.
     */
    public static List<List<String>> parseAll(String text, BankCsvSchema schema) {
        List<List<String>> rows = new ArrayList<>();
        try (CSVParser parser = buildFormat(schema, true).parse(textReader(text, schema))) {
            for (CSVRecord record : parser) {
                List<String> values = new ArrayList<>(record.size());
                for (int i = 0; i < record.size(); i++) {
                    values.add(record.get(i));
                }
                rows.add(values);
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to parse CSV: " + e.getMessage(), e);
        }
        return rows;
    }

    private static Reader textReader(String text, BankCsvSchema schema) {
        if (schema.getSkipLines() <= 0) {
            return new StringReader(text);
        }
        // Drop the configured number of leading lines (metadata banners some banks export before the header).
        int skipped = 0;
        int idx = 0;
        while (skipped < schema.getSkipLines() && idx < text.length()) {
            int newline = text.indexOf('\n', idx);
            if (newline < 0) {
                idx = text.length();
                break;
            }
            idx = newline + 1;
            skipped++;
        }
        return new StringReader(text.substring(idx));
    }

    private static CSVFormat buildFormat(BankCsvSchema schema, boolean honourHeader) {
        CSVFormat.Builder builder = CSVFormat.DEFAULT.builder()
                .setDelimiter(schema.getDelimiter())
                .setQuote(schema.getQuoteChar())
                .setIgnoreSurroundingSpaces(true)
                .setTrim(false)
                .setIgnoreEmptyLines(true)
                .setAllowMissingColumnNames(true);
        if (honourHeader && schema.isHasHeader()) {
            builder.setHeader().setSkipHeaderRecord(true);
        }
        return builder.build();
    }
}
