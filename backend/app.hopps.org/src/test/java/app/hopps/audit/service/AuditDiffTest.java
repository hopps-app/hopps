package app.hopps.audit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AuditDiffTest {

    private static Map<String, Object> state(Object... keysAndValues) {
        Map<String, Object> state = new LinkedHashMap<>();
        for (int i = 0; i < keysAndValues.length; i += 2) {
            state.put((String) keysAndValues[i], keysAndValues[i + 1]);
        }
        return state;
    }

    @Test
    @DisplayName("Equal states have no changes")
    void noChanges() {
        assertTrue(AuditDiff.diff(state("name", "A", "total", "10"), state("name", "A", "total", "10")).isEmpty());
    }

    @Test
    @DisplayName("A changed field lists its old and new value, unchanged fields are left out")
    void changedField() {
        Map<String, Object> changes = AuditDiff.diff(state("name", "A", "total", "10"),
                state("name", "B", "total", "10"));

        assertEquals(1, changes.size());
        assertEquals(state("old", "A", "new", "B"), changes.get("name"));
    }

    @Test
    @DisplayName("A value that was set or cleared is a change from or to null")
    void setAndCleared() {
        Map<String, Object> changes = AuditDiff.diff(state("bommelId", null, "name", "A"),
                state("bommelId", 24L, "name", null));

        assertEquals(state("old", null, "new", 24L), changes.get("bommelId"));
        assertEquals(state("old", "A", "new", null), changes.get("name"));
    }

    @Test
    @DisplayName("A field missing on one side counts as null there")
    void missingField() {
        Map<String, Object> changes = AuditDiff.diff(state("name", "A"), state("name", "A", "invoiceId", "R-1"));

        assertEquals(1, changes.size());
        assertEquals(state("old", null, "new", "R-1"), changes.get("invoiceId"));
    }

    @Test
    @DisplayName("Lists and maps compare by content")
    void collections() {
        Map<String, Object> before = state("tags", List.of("a", "b"), "categoryValues", state("3", "Ideeller Bereich"));
        Map<String, Object> same = state("tags", List.of("a", "b"), "categoryValues", state("3", "Ideeller Bereich"));
        Map<String, Object> other = state("tags", List.of("a", "b"), "categoryValues", state("3", "Zweckbetrieb"));

        assertTrue(AuditDiff.diff(before, same).isEmpty());
        assertEquals(List.of("categoryValues"), List.copyOf(AuditDiff.diff(before, other).keySet()));
    }
}
