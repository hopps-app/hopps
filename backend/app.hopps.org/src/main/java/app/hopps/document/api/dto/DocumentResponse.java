package app.hopps.document.api.dto;

import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.domain.ExtractionSource;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Response DTO for Document operations. Used to return document data including analysis status and results.
 */
public record DocumentResponse(
        Long id,
        String fileName,
        String fileContentType,
        Long fileSize,
        Long bommelId,
        DocumentType documentType,
        boolean privatelyPaid,
        AnalysisStatus analysisStatus,
        String analysisError,
        ExtractionSource extractionSource,
        // Analysis results (may be null if analysis not complete)
        String name,
        BigDecimal total,
        BigDecimal totalTax,
        String currencyCode,
        Instant transactionTime,
        // Sender information
        String senderName,
        String senderStreet,
        String senderZipCode,
        String senderCity,
        // Tags
        List<String> tags,
        // Timestamps
        Instant createdAt,
        String uploadedBy) {
    /**
     * Creates a DocumentResponse from a Document entity.
     */
    public static DocumentResponse from(Document doc) {
        List<String> tagNames = doc.getDocumentTags() != null
                ? doc.getDocumentTags()
                        .stream()
                        .map(dt -> dt.getTag().getName())
                        .collect(Collectors.toList())
                : List.of();

        return new DocumentResponse(
                doc.getId(),
                doc.getFileName(),
                doc.getFileContentType(),
                doc.getFileSize(),
                doc.getBommel() != null ? doc.getBommel().id : null,
                doc.getDocumentType(),
                doc.isPrivatelyPaid(),
                doc.getAnalysisStatus(),
                doc.getAnalysisError(),
                doc.getExtractionSource(),
                doc.getName(),
                doc.getTotal(),
                doc.getTotalTax(),
                doc.getCurrencyCode(),
                doc.getTransactionTime(),
                doc.getSenderName(),
                doc.getSenderStreet(),
                doc.getSenderZipCode(),
                doc.getSenderCity(),
                tagNames,
                doc.getCreatedAt(),
                doc.getUploadedBy());
    }
}
