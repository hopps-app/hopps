package app.hopps.document.audit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import app.hopps.audit.domain.AuditAction;
import app.hopps.audit.domain.AuditEntityType;
import app.hopps.audit.service.AuditService;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.document.domain.ExtractionSource;
import app.hopps.organization.domain.Organization;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * The document auditor turns what happened to a receipt into audit entries. The service that writes them is replaced by
 * one that only collects them, so this needs neither a database nor a request.
 */
class DocumentAuditorTest {

    record Entry(AuditEntityType entityType, Long organizationId, Long entityId, AuditAction action,
            Map<String, Object> changes, Map<String, Object> snapshot) {
    }

    static class CollectingAuditService extends AuditService {
        final List<Entry> entries = new ArrayList<>();

        @Override
        public void record(AuditEntityType entityType, Long organizationId, Long entityId, AuditAction action,
                Map<String, Object> changes, Map<String, Object> snapshot) {
            entries.add(new Entry(entityType, organizationId, entityId, action, changes, snapshot));
        }
    }

    static Map<String, Object> change(Object oldValue, Object newValue) {
        Map<String, Object> change = new LinkedHashMap<>();
        change.put("old", oldValue);
        change.put("new", newValue);
        return change;
    }

    CollectingAuditService audit;
    DocumentAuditor auditor;
    Document document;

    @BeforeEach
    void setup() {
        audit = new CollectingAuditService();
        auditor = new DocumentAuditor();
        auditor.audit = audit;

        Organization organization = new Organization();
        organization.setId(4L);
        document = new Document();
        document.id = 7L;
        document.setOrganization(organization);
        document.setFileName("rechnung.pdf");
        document.setDocumentStatus(DocumentStatus.UPLOADED);
    }

    @Test
    @DisplayName("Uploading records the full state")
    void created() {
        auditor.created(document);

        assertEquals(1, audit.entries.size());
        Entry entry = audit.entries.get(0);
        assertEquals(AuditEntityType.DOCUMENT, entry.entityType());
        assertEquals(4L, entry.organizationId());
        assertEquals(7L, entry.entityId());
        assertEquals(AuditAction.CREATE, entry.action());
        assertEquals("rechnung.pdf", entry.snapshot().get("fileName"));
        assertEquals("UPLOADED", entry.snapshot().get("documentStatus"));
        assertNull(entry.changes());
    }

    @Test
    @DisplayName("A finished analysis records the source and the fields it filled")
    void analyzed() {
        Map<String, Object> before = auditor.snapshot(document);
        document.setName("Getränke Huber");
        document.setTotal(new BigDecimal("287.40"));
        document.setExtractionSource(ExtractionSource.AI);

        auditor.analyzed(document, before);

        Entry entry = audit.entries.get(0);
        assertEquals(AuditAction.ANALYZE, entry.action());
        assertEquals("AI", entry.changes().get("extractionSource"));
        assertEquals(change(null, "Getränke Huber"), entry.changes().get("name"));
        assertEquals(change(null, "287.4"), entry.changes().get("total"));
    }

    @Test
    @DisplayName("An analysis without results is recorded too")
    void analyzedWithoutResults() {
        auditor.analyzed(document, auditor.snapshot(document));

        Entry entry = audit.entries.get(0);
        assertEquals(AuditAction.ANALYZE, entry.action());
        assertEquals(1, entry.changes().size());
        assertTrue(entry.changes().containsKey("extractionSource"));
    }

    @Test
    @DisplayName("A failed analysis records the reason")
    void analysisFailed() {
        document.setAnalysisError("ANALYSIS_SERVICE_UNAVAILABLE");

        auditor.analysisFailed(document);

        Entry entry = audit.entries.get(0);
        assertEquals(AuditAction.ANALYSIS_FAIL, entry.action());
        assertEquals("ANALYSIS_SERVICE_UNAVAILABLE", entry.changes().get("error"));
    }

    @Test
    @DisplayName("Unchanged fields write no update")
    void updatedWithoutChanges() {
        auditor.updated(document, auditor.snapshot(document));

        assertTrue(audit.entries.isEmpty());
    }

    @Test
    @DisplayName("Going back to review is recorded only when the status changed")
    void reopened() {
        auditor.reopened(document, DocumentStatus.UPLOADED);
        assertTrue(audit.entries.isEmpty());

        document.setDocumentStatus(DocumentStatus.ANALYZED);
        auditor.reopened(document, DocumentStatus.CONFIRMED);

        Entry entry = audit.entries.get(0);
        assertEquals(AuditAction.REOPEN, entry.action());
        assertEquals(change("CONFIRMED", "ANALYZED"), entry.changes().get("documentStatus"));
    }

    @Test
    @DisplayName("Replacing the file records the old and the new file")
    void fileReplaced() {
        Map<String, Object> before = auditor.snapshot(document);
        document.setFileName("rechnung-korrigiert.pdf");

        auditor.fileReplaced(document, before);

        Entry entry = audit.entries.get(0);
        assertEquals(AuditAction.FILE_REPLACE, entry.action());
        assertEquals(change("rechnung.pdf", "rechnung-korrigiert.pdf"), entry.changes().get("fileName"));
    }
}
