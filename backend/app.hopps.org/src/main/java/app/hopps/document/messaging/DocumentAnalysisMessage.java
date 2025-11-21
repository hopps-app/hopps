package app.hopps.document.messaging;

import app.hopps.document.domain.DocumentType;

/**
 * Message to queue a document for asynchronous analysis.
 */
public record DocumentAnalysisMessage(
        Long transactionRecordId,
        String documentKey,
        DocumentType type,
        String contentType,
        Long bommelId,
        boolean privatelyPaid,
        String submitterUserName
) {
}
