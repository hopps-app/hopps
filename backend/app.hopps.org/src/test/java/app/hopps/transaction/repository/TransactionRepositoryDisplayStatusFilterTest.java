package app.hopps.transaction.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import app.hopps.transaction.domain.TransactionDisplayStatus;
import app.hopps.transaction.domain.TransactionStatus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Covers how the requested display statuses turn into JPQL. The clauses must only name parameters that get bound, and a
 * request that lists every status must not restrict anything.
 */
class TransactionRepositoryDisplayStatusFilterTest {

    private StringBuilder query;
    private Map<String, Object> params;

    private void append(List<TransactionDisplayStatus> statuses, String prefix) {
        query = new StringBuilder();
        params = new HashMap<>();
        TransactionRepository.appendDisplayStatusFilter(query, params, statuses, prefix);
    }

    @Test
    @DisplayName("No status adds nothing")
    void noStatus() {
        append(null, "");
        assertEquals("", query.toString());
        assertTrue(params.isEmpty());

        append(List.of(), "");
        assertEquals("", query.toString());
    }

    @Test
    @DisplayName("All four statuses exclude nothing")
    void allStatuses() {
        append(List.of(TransactionDisplayStatus.values()), "");
        assertEquals("", query.toString());
        assertTrue(params.isEmpty());
    }

    @Test
    @DisplayName("Confirmed only binds the confirmed status")
    void confirmedOnly() {
        append(List.of(TransactionDisplayStatus.CONFIRMED), "");

        assertTrue(query.toString().contains("status = :dsConfirmed"), query.toString());
        assertFalse(query.toString().contains(":dsDraft"), query.toString());
        assertEquals(Map.of("dsConfirmed", TransactionStatus.CONFIRMED), params);
    }

    @Test
    @DisplayName("Each unconfirmed status is a draft with its own coverage condition")
    void draftStates() {
        append(List.of(TransactionDisplayStatus.DRAFT), "");
        assertTrue(query.toString().contains("id NOT IN ("), query.toString());
        assertEquals(Map.of("dsDraft", TransactionStatus.DRAFT), params);

        append(List.of(TransactionDisplayStatus.PARTIAL), "");
        assertTrue(query.toString().contains("<> COALESCE(m.transaction.total, 0)"), query.toString());

        append(List.of(TransactionDisplayStatus.LINKED), "");
        assertTrue(query.toString().contains("= COALESCE(m.transaction.total, 0)"), query.toString());
        assertFalse(query.toString().contains("<> COALESCE"), query.toString());
    }

    @Test
    @DisplayName("Several statuses OR together and bind both statuses")
    void severalStatuses() {
        append(List.of(TransactionDisplayStatus.LINKED, TransactionDisplayStatus.CONFIRMED), "");

        assertTrue(query.toString().contains(" or "), query.toString());
        assertEquals(Map.of("dsDraft", TransactionStatus.DRAFT, "dsConfirmed", TransactionStatus.CONFIRMED), params);
    }

    @Test
    @DisplayName("The alias prefix goes on the outer columns only")
    void prefixesOuterColumns() {
        append(List.of(TransactionDisplayStatus.DRAFT), "t.");

        assertTrue(query.toString().contains("t.status = :dsDraft"), query.toString());
        assertTrue(query.toString().contains("t.id NOT IN ("), query.toString());
    }
}
