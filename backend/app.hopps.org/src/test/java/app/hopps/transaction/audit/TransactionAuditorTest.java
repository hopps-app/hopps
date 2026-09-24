package app.hopps.transaction.audit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import app.hopps.audit.domain.AuditAction;
import app.hopps.audit.domain.AuditEntityType;
import app.hopps.audit.service.AuditService;
import app.hopps.organization.domain.Organization;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * The transaction auditor turns what happened into audit entries. The service that writes them is replaced by one that
 * only collects them, so this needs neither a database nor a request.
 */
class TransactionAuditorTest {

    /** One entry as it would be written. */
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

    /** {@code {old, new}} as the diff writes it; Map.of cannot hold the null. */
    static Map<String, Object> change(Object oldValue, Object newValue) {
        Map<String, Object> change = new LinkedHashMap<>();
        change.put("old", oldValue);
        change.put("new", newValue);
        return change;
    }

    CollectingAuditService audit;
    TransactionAuditor auditor;
    Transaction tx;

    @BeforeEach
    void setup() {
        audit = new CollectingAuditService();
        auditor = new TransactionAuditor();
        auditor.audit = audit;

        Organization organization = new Organization();
        organization.setId(4L);
        tx = new Transaction();
        tx.id = 42L;
        tx.setOrganization(organization);
        tx.setName("Office supplies");
        tx.setTotal(new BigDecimal("-125.50"));
    }

    @Test
    @DisplayName("Creating records the full state")
    void created() {
        auditor.created(tx);

        assertEquals(1, audit.entries.size());
        Entry entry = audit.entries.get(0);
        assertEquals(AuditEntityType.TRANSACTION, entry.entityType());
        assertEquals(4L, entry.organizationId());
        assertEquals(42L, entry.entityId());
        assertEquals(AuditAction.CREATE, entry.action());
        assertEquals("Office supplies", entry.snapshot().get("name"));
        assertEquals("-125.5", entry.snapshot().get("total"));
        assertNull(entry.changes());
    }

    @Test
    @DisplayName("Updating records only the changed fields, and nothing when none changed")
    void updated() {
        Map<String, Object> before = auditor.snapshot(tx);

        auditor.updated(tx, before);
        assertTrue(audit.entries.isEmpty());

        tx.setName("Stationery");
        auditor.updated(tx, before);

        assertEquals(1, audit.entries.size());
        Entry entry = audit.entries.get(0);
        assertEquals(AuditAction.UPDATE, entry.action());
        assertEquals(List.of("name"), List.copyOf(entry.changes().keySet()));
        assertEquals(Map.of("old", "Office supplies", "new", "Stationery"), entry.changes().get("name"));
        assertNull(entry.snapshot());
    }

    @Test
    @DisplayName("A status change is recorded as the action that caused it")
    void statusChanged() {
        tx.setStatus(TransactionStatus.CONFIRMED);

        auditor.statusChanged(tx, TransactionStatus.DRAFT, AuditAction.CONFIRM);

        assertEquals(1, audit.entries.size());
        Entry entry = audit.entries.get(0);
        assertEquals(AuditAction.CONFIRM, entry.action());
        assertEquals(Map.of("old", "DRAFT", "new", "CONFIRMED"), entry.changes().get("status"));
    }

    @Test
    @DisplayName("An unchanged status writes no confirm or reopen entry")
    void unchangedStatusIsNotAudited() {
        tx.setStatus(TransactionStatus.CONFIRMED);

        auditor.statusChanged(tx, TransactionStatus.CONFIRMED, AuditAction.CONFIRM);

        assertTrue(audit.entries.isEmpty());
    }

    @Test
    @DisplayName("A link records the bank transaction and the amount used, and an amount it gave the transaction")
    void linked() {
        auditor.linked(tx, 7L, new BigDecimal("125.50"), false, false);
        auditor.linked(tx, 8L, new BigDecimal("30.00"), true, true);

        Entry plain = audit.entries.get(0);
        assertEquals(AuditAction.LINK, plain.action());
        assertEquals(7L, plain.changes().get("bankTransactionId"));
        assertEquals("125.5", plain.changes().get("matchedAmount"));
        assertEquals(false, plain.changes().get("amountManual"));
        assertNull(plain.changes().get("total"));

        Entry adopted = audit.entries.get(1);
        assertEquals(true, adopted.changes().get("amountManual"));
        assertEquals(change(null, "-125.5"), adopted.changes().get("total"));
    }

    @Test
    @DisplayName("Unlinking and changing the amount used are recorded on the transaction")
    void unlinkedAndAllocationChanged() {
        auditor.unlinked(4L, 42L, 7L, new BigDecimal("125.50"));
        auditor.allocationChanged(4L, 42L, 7L, new BigDecimal("100.00"), new BigDecimal("120.00"));

        Entry unlink = audit.entries.get(0);
        assertEquals(AuditAction.UNLINK, unlink.action());
        assertEquals(42L, unlink.entityId());
        assertEquals("125.5", unlink.changes().get("matchedAmount"));

        Entry allocation = audit.entries.get(1);
        assertEquals(AuditAction.ALLOCATION_UPDATE, allocation.action());
        assertEquals(Map.of("old", "100", "new", "120"), allocation.changes().get("matchedAmount"));
    }
}
