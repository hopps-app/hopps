package app.hopps.transaction.audit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import app.hopps.audit.service.AuditDiff;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionCategoryValue;
import app.hopps.transaction.domain.TransactionStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TransactionSnapshotTest {

    @Test
    @DisplayName("Amounts are plain strings without trailing zeros, so the scale never counts as a change")
    void amounts() {
        assertEquals("10", TransactionSnapshot.amount(new BigDecimal("10.00")));
        assertEquals("10", TransactionSnapshot.amount(new BigDecimal("10.0")));
        assertEquals("0.5", TransactionSnapshot.amount(new BigDecimal("0.50")));
        assertEquals("100", TransactionSnapshot.amount(new BigDecimal("1E+2")));
        assertEquals("-125.5", TransactionSnapshot.amount(new BigDecimal("-125.50")));
        assertEquals("0", TransactionSnapshot.amount(new BigDecimal("0.00")));
        assertNull(TransactionSnapshot.amount(null));
    }

    @Test
    @DisplayName("A snapshot carries the audited fields as plain values")
    void fields() {
        Transaction tx = new Transaction();
        tx.setName("Office supplies");
        tx.setTotal(new BigDecimal("-125.50"));
        tx.setStatus(TransactionStatus.DRAFT);
        tx.setPrivatelyPaid(true);
        tx.setTags(Set.of("b", "a"));
        tx.getCategoryValues().add(new TransactionCategoryValue(tx, 7L, "Zweckbetrieb"));
        tx.getCategoryValues().add(new TransactionCategoryValue(tx, 3L, "Ideeller Bereich"));

        Map<String, Object> snapshot = TransactionSnapshot.of(tx);

        assertEquals("Office supplies", snapshot.get("name"));
        assertEquals("-125.5", snapshot.get("total"));
        assertEquals("DRAFT", snapshot.get("status"));
        assertEquals(true, snapshot.get("privatelyPaid"));
        assertNull(snapshot.get("bommelId"));
        assertEquals(List.of("a", "b"), snapshot.get("tags"));
        assertEquals(List.of("3", "7"), List.copyOf(((Map<?, ?>) snapshot.get("categoryValues")).keySet()));
    }

    @Test
    @DisplayName("Only what changed shows up when two snapshots are compared")
    void diffOfTwoStates() {
        Transaction tx = new Transaction();
        tx.setName("Before");
        tx.setTotal(new BigDecimal("10.0"));
        Map<String, Object> before = TransactionSnapshot.of(tx);

        tx.setName("After");
        // Same value, different scale: not a change.
        tx.setTotal(new BigDecimal("10.00"));

        Map<String, Object> changes = AuditDiff.diff(before, TransactionSnapshot.of(tx));

        assertEquals(List.of("name"), List.copyOf(changes.keySet()));
    }
}
