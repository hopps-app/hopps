package app.hopps.document.audit;

import app.hopps.audit.domain.AuditAction;
import app.hopps.audit.domain.AuditEntityType;
import app.hopps.audit.service.AuditDiff;
import app.hopps.audit.service.AuditService;
import app.hopps.audit.service.EntityAuditor;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentStatus;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Audit of documents (Belege): uploading, the analysis, changes, replacing the file, confirming (which creates the
 * transaction), going back to review and deleting. What happens to the transaction afterwards is recorded on the
 * transaction.
 * <p>
 * The analysis runs in the background, so its entries usually have no actor.
 */
@ApplicationScoped
public class DocumentAuditor implements EntityAuditor<Document> {

    @Inject
    AuditService audit;

    @Override
    public AuditEntityType entityType() {
        return AuditEntityType.DOCUMENT;
    }

    @Override
    public Long entityId(Document document) {
        return document.getId();
    }

    @Override
    public Long organizationId(Document document) {
        return document.getOrganization() == null ? null : document.getOrganization().getId();
    }

    @Override
    public Map<String, Object> snapshot(Document document) {
        return DocumentSnapshot.of(document);
    }

    /**
     * Records an upload. A document created from a bank transaction already has its transaction, so the snapshot shows
     * where it came from.
     */
    public void created(Document document) {
        audit.created(this, document);
    }

    /** Records the fields that differ from {@code before}; nothing is written when none does. */
    public void updated(Document document, Map<String, Object> before) {
        audit.updated(this, document, before);
    }

    /** Records that the file was replaced, with the old and the new file. */
    public void fileReplaced(Document document, Map<String, Object> before) {
        Map<String, Object> after = snapshot(document);
        Map<String, Object> changes = new LinkedHashMap<>();
        for (String field : new String[] { "fileName", "fileSize", "fileHash" }) {
            changes.put(field, AuditDiff.change(before.get(field), after.get(field)));
        }
        record(document, AuditAction.FILE_REPLACE, changes);
    }

    /** Records that a user asked for the document to be analyzed again. */
    public void reanalyzeRequested(Document document) {
        record(document, AuditAction.REANALYZE, null);
    }

    /**
     * Records a finished analysis: where the values came from and which fields it filled or changed compared to
     * {@code before}. Written even when nothing was recognized, so the history shows that the analysis ran.
     */
    public void analyzed(Document document, Map<String, Object> before) {
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("extractionSource",
                document.getExtractionSource() == null ? null : document.getExtractionSource().name());
        changes.putAll(AuditDiff.diff(before, snapshot(document)));
        record(document, AuditAction.ANALYZE, changes);
    }

    /** Records a failed analysis with the reason shown to the user. */
    public void analysisFailed(Document document) {
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("error", document.getAnalysisError());
        record(document, AuditAction.ANALYSIS_FAIL, changes);
    }

    /** Records the confirmation, which creates the transaction (or keeps the one it already had). */
    public void confirmed(Document document, DocumentStatus before) {
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("documentStatus", AuditDiff.change(name(before), name(document.getDocumentStatus())));
        changes.put("transactionId", document.getTransaction() == null ? null : document.getTransaction().getId());
        record(document, AuditAction.CONFIRM, changes);
    }

    /**
     * Records that the document went back to review because its transaction was reopened or deleted; nothing is written
     * when the status did not change.
     */
    public void reopened(Document document, DocumentStatus before) {
        if (before == document.getDocumentStatus()) {
            return;
        }
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("documentStatus", AuditDiff.change(name(before), name(document.getDocumentStatus())));
        record(document, AuditAction.REOPEN, changes);
    }

    /** Records a deletion with the full state; call it before the document is removed. */
    public void deleted(Document document) {
        audit.deleted(this, document, snapshot(document));
    }

    private void record(Document document, AuditAction action, Map<String, Object> changes) {
        audit.record(entityType(), organizationId(document), document.getId(), action, changes, null);
    }

    private static String name(DocumentStatus status) {
        return status == null ? null : status.name();
    }
}
