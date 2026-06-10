package app.hopps.bankimport.service;

import app.hopps.bankimport.api.dto.CsvPreviewResponse;
import app.hopps.bankimport.parser.DelimiterDetector;
import app.hopps.bankimport.parser.EncodingDetector;
import app.hopps.bankimport.parser.Mt940Parser;
import app.hopps.bankimport.parser.Mt940Parser.ParsedMt940Transaction;
import jakarta.enterprise.context.ApplicationScoped;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import java.io.IOException;
import java.io.StringReader;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Decodes a freshly uploaded CSV file and returns a small preview (encoding/delimiter detection + first 20 lines) for
 * the schema wizard. No persistence happens here — this runs synchronously in the request thread.
 */
@ApplicationScoped
public class CsvPreviewService {

    /** Maximum number of raw lines returned to the UI. Tuned for visual scanning, not full validation. */
    private static final int PREVIEW_LINES = 20;

    /** Maximum number of MT940 sample transactions returned in the preview. */
    private static final int MT940_PREVIEW_TRANSACTIONS = 5;

    public CsvPreviewResponse preview(byte[] content) {
        // Fast-path: detect MT940 before CSV processing
        if (Mt940Parser.isMt940(content)) {
            return previewMt940(content);
        }
        Charset charset;
        String text;
        String warning = null;
        boolean encodingValid = true;
        try {
            charset = EncodingDetector.detect(content);
            text = EncodingDetector.decodeStrict(content, charset);
        } catch (IllegalArgumentException primary) {
            // Detector picked something that produced replacement chars — try Windows-1252 as the most common
            // German-bank fallback. Surface the issue regardless so the user can override the encoding manually.
            try {
                charset = EncodingDetector.FALLBACK_CHARSET;
                text = EncodingDetector.decodeStrict(content, charset);
                warning = "Detected encoding produced unreadable characters; falling back to "
                        + charset.displayName();
            } catch (IllegalArgumentException fallback) {
                charset = EncodingDetector.FALLBACK_CHARSET;
                text = new String(content, charset);
                encodingValid = false;
                warning = "Could not decode file cleanly. Please choose an encoding manually.";
            }
        }

        List<String> allLines = splitLines(text);
        List<String> rawLines = allLines.size() > PREVIEW_LINES
                ? new ArrayList<>(allLines.subList(0, PREVIEW_LINES))
                : allLines;
        char delimiter = DelimiterDetector.detect(rawLines);

        List<List<String>> sampleRows = new ArrayList<>();
        List<String> headerColumns = List.of();
        try (CSVParser parser = CSVFormat.DEFAULT.builder()
                .setDelimiter(delimiter)
                .setQuote('"')
                .setIgnoreSurroundingSpaces(true)
                .setIgnoreEmptyLines(true)
                .setAllowMissingColumnNames(true)
                .build()
                .parse(new StringReader(String.join("\n", rawLines)))) {
            int row = 0;
            for (CSVRecord record : parser) {
                List<String> values = new ArrayList<>(record.size());
                for (int i = 0; i < record.size(); i++) {
                    values.add(record.get(i));
                }
                if (row == 0) {
                    headerColumns = values;
                }
                sampleRows.add(values);
                row++;
            }
        } catch (IOException e) {
            warning = (warning == null ? "" : warning + " ") + "CSV parsing failed: " + e.getMessage();
        }

        return new CsvPreviewResponse(
                charset.name(),
                String.valueOf(delimiter),
                encodingValid,
                warning,
                allLines.size(),
                rawLines,
                headerColumns,
                sampleRows,
                "CSV");
    }

    private CsvPreviewResponse previewMt940(byte[] content) {
        String text;
        String warning = null;
        Charset charset;
        boolean encodingValid = true;
        try {
            charset = EncodingDetector.detect(content);
            text = EncodingDetector.decodeStrict(content, charset);
        } catch (IllegalArgumentException e) {
            try {
                charset = EncodingDetector.FALLBACK_CHARSET;
                text = EncodingDetector.decodeStrict(content, charset);
                warning = "Detected encoding produced unreadable characters; falling back to "
                        + charset.displayName();
            } catch (IllegalArgumentException e2) {
                charset = EncodingDetector.FALLBACK_CHARSET;
                text = new String(content, charset);
                encodingValid = false;
                warning = "Could not decode file cleanly. Please choose an encoding manually.";
            }
        }

        List<ParsedMt940Transaction> transactions;
        try {
            transactions = Mt940Parser.parse(text);
        } catch (Exception e) {
            transactions = List.of();
            warning = (warning == null ? "" : warning + " ") + "MT940 parsing failed: " + e.getMessage();
        }

        int totalTransactions = transactions.size();
        List<ParsedMt940Transaction> sample = transactions.size() > MT940_PREVIEW_TRANSACTIONS
                ? transactions.subList(0, MT940_PREVIEW_TRANSACTIONS)
                : transactions;

        // Build sample rows: [date, amount, currency, purpose, counterparty]
        List<List<String>> sampleRows = new ArrayList<>();
        for (ParsedMt940Transaction tx : sample) {
            sampleRows.add(Arrays.asList(
                    tx.bookingDate() != null ? tx.bookingDate().toString() : "",
                    tx.amount() != null ? tx.amount().toPlainString() : "",
                    tx.currency() != null ? tx.currency() : "",
                    tx.purpose() != null ? tx.purpose() : "",
                    tx.counterpartyName() != null ? tx.counterpartyName() : ""));
        }

        List<String> headerColumns = List.of("bookingDate", "amount", "currency", "purpose", "counterpartyName");

        return new CsvPreviewResponse(
                charset.name(),
                null,
                encodingValid,
                warning,
                totalTransactions,
                List.of(),
                headerColumns,
                sampleRows,
                "MT940");
    }

    private static List<String> splitLines(String text) {
        List<String> lines = new ArrayList<>();
        int start = 0;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '\n') {
                String line = text.substring(start, i);
                if (line.endsWith("\r")) {
                    line = line.substring(0, line.length() - 1);
                }
                lines.add(line);
                start = i + 1;
            }
        }
        if (start < text.length()) {
            lines.add(text.substring(start));
        }
        return lines;
    }
}
