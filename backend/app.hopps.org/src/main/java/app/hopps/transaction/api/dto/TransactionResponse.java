package app.hopps.transaction.api.dto;

import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.ExtractionSource;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Response DTO for Transaction operations.
 */
public record TransactionResponse(
        Long id,
        Long documentId,
        Long bommelId,
        String bommelName,
        TransactionStatus status,
        String name,
        BigDecimal total,
        BigDecimal totalTax,
        String currencyCode,
        Instant transactionTime,
        Instant dueDate,
        boolean privatelyPaid,
        String senderName,
        String senderStreet,
        String senderZipCode,
        String senderCity,
        List<String> tags,
        // Analysis data (from linked document)
        AnalysisStatus analysisStatus,
        ExtractionSource extractionSource,
        String analysisError,
        Instant createdAt,
        Instant updatedAt,
        String createdBy,
        // Magnitude of this transaction's amount already covered by linked bank movements (signed net, then abs). The
        // still-open amount to reconcile is |total| - coveredAmount. Null when not computed for this response.
        BigDecimal coveredAmount) {

    /**
     * Creates a TransactionResponse from a Transaction entity without coverage information.
     */
    public static TransactionResponse from(Transaction tx) {
        return from(tx, null);
    }

    /**
     * Creates a TransactionResponse from a Transaction entity, including how much of its amount is already covered by
     * linked bank movements.
     */
    public static TransactionResponse from(Transaction tx, BigDecimal coveredAmount) {
        List<String> tagList = tx.getTags() != null
                ? new ArrayList<>(tx.getTags())
                : List.of();

        // Get analysis info from linked document if available
        AnalysisStatus analysisStatus = null;
        ExtractionSource extractionSource = null;
        String analysisError = null;
        if (tx.getDocument() != null) {
            analysisStatus = tx.getDocument().getAnalysisStatus();
            extractionSource = tx.getDocument().getExtractionSource();
            analysisError = tx.getDocument().getAnalysisError();
        }

        return new TransactionResponse(
                tx.getId(),
                tx.getDocument() != null ? tx.getDocument().getId() : null,
                tx.getBommel() != null ? tx.getBommel().id : null,
                tx.getBommel() != null ? tx.getBommel().getName() : null,
                tx.getStatus(),
                tx.getName(),
                tx.getTotal(),
                tx.getTotalTax(),
                tx.getCurrencyCode(),
                tx.getTransactionTime(),
                tx.getDueDate(),
                tx.isPrivatelyPaid(),
                tx.getSenderName(),
                tx.getSenderStreet(),
                tx.getSenderZipCode(),
                tx.getSenderCity(),
                tagList,
                analysisStatus,
                extractionSource,
                analysisError,
                tx.getCreatedAt(),
                tx.getUpdatedAt(),
                tx.getCreatedBy(),
                coveredAmount);
    }
}
