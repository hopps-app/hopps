package app.hopps.document.api;

import app.hopps.transaction.domain.AnalysisStatus;
import app.hopps.transaction.domain.TransactionStatus;

/**
 * Response for async document upload.
 * Returns minimal data immediately (202 Accepted) while analysis runs in background.
 */
public record DocumentUploadResponse(
        Long transactionRecordId,
        String documentKey,
        TransactionStatus status,
        AnalysisStatus analysisStatus,
        Links _links
) {
    public record Links(
            String self,
            String analysis,
            String events,
            String document
    ) {
    }

    public static DocumentUploadResponse create(Long transactionRecordId, String documentKey,
                                                 TransactionStatus status, AnalysisStatus analysisStatus) {
        Links links = new Links(
                "/transaction-records/" + transactionRecordId,
                "/transaction-records/" + transactionRecordId + "/analysis",
                "/transaction-records/" + transactionRecordId + "/events",
                "/document/" + documentKey
        );
        return new DocumentUploadResponse(transactionRecordId, documentKey, status, analysisStatus, links);
    }
}
