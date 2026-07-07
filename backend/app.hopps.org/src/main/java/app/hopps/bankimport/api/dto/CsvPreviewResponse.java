package app.hopps.bankimport.api.dto;

import java.util.List;

/**
 * Response of the CSV preview endpoint: detected dialect plus a small sample of raw lines so the user (or the schema
 * wizard) can verify that delimiter / encoding / header line look right before kicking off the import.
 */
public record CsvPreviewResponse(
        String detectedEncoding,
        String detectedDelimiter,
        boolean encodingValid,
        String encodingWarning,
        int totalLines,
        List<String> rawLines,
        List<String> headerColumns,
        List<List<String>> sampleRows,
        String fileType) {
}
