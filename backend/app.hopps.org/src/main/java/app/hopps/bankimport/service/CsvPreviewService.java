package app.hopps.bankimport.service;

import app.hopps.bankimport.api.dto.CsvPreviewResponse;
import app.hopps.bankimport.parser.DelimiterDetector;
import app.hopps.bankimport.parser.EncodingDetector;
import jakarta.enterprise.context.ApplicationScoped;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import java.io.IOException;
import java.io.StringReader;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;

/**
 * Decodes a freshly uploaded CSV file and returns a small preview (encoding/delimiter detection + first 20 lines) for
 * the schema wizard. No persistence happens here — this runs synchronously in the request thread.
 */
@ApplicationScoped
public class CsvPreviewService {

    /** Maximum number of raw lines returned to the UI. Tuned for visual scanning, not full validation. */
    private static final int PREVIEW_LINES = 20;

    public CsvPreviewResponse preview(byte[] content) {
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
                sampleRows);
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
