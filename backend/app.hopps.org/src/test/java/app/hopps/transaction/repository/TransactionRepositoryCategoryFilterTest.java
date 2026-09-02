package app.hopps.transaction.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Covers how {@code categoryValue} request entries turn into JPQL. Values of one group must OR together and the groups
 * must AND: a transaction carries at most one value per group, so ANDing two values of the same group could never match
 * anything.
 */
class TransactionRepositoryCategoryFilterTest {

    private StringBuilder query;
    private Map<String, Object> params;

    private void append(List<String> categoryValues) {
        query = new StringBuilder();
        params = new HashMap<>();
        TransactionRepository.appendCategoryFilters(query, params, categoryValues, "");
    }

    private int clauseCount() {
        return query.toString().split("id IN \\(SELECT", -1).length - 1;
    }

    @Test
    @DisplayName("Several values of one group become a single IN clause")
    void groupsValuesOfTheSameGroup() {
        append(List.of("3:Ideeller Bereich", "3:Zweckbetrieb"));

        assertEquals(1, clauseCount());
        assertTrue(query.toString().contains("cv.value IN :cgVal0"), query.toString());
        assertEquals(3L, params.get("cgId0"));
        assertEquals(List.of("Ideeller Bereich", "Zweckbetrieb"), params.get("cgVal0"));
    }

    @Test
    @DisplayName("Different groups stay separate AND clauses")
    void keepsGroupsApart() {
        append(List.of("3:Ideeller Bereich", "7:Kostenstelle A"));

        assertEquals(2, clauseCount());
        assertEquals(3L, params.get("cgId0"));
        assertEquals(List.of("Ideeller Bereich"), params.get("cgVal0"));
        assertEquals(7L, params.get("cgId1"));
        assertEquals(List.of("Kostenstelle A"), params.get("cgVal1"));
    }

    @Test
    @DisplayName("A repeated value is only bound once")
    void deduplicatesValues() {
        append(List.of("3:Zweckbetrieb", "3:Zweckbetrieb"));

        assertEquals(List.of("Zweckbetrieb"), params.get("cgVal0"));
    }

    @Test
    @DisplayName("Only the first colon separates id from value")
    void keepsColonsInsideTheValue() {
        append(List.of("3:Sparte: Fussball"));

        assertEquals(List.of("Sparte: Fussball"), params.get("cgVal0"));
    }

    @Test
    @DisplayName("Malformed entries are skipped")
    void skipsMalformedEntries() {
        append(Arrays.asList(null, "", ":no-id", "3:", "abc:x", "3:Zweckbetrieb"));

        assertEquals(1, clauseCount());
        assertEquals(3L, params.get("cgId0"));
        assertEquals(List.of("Zweckbetrieb"), params.get("cgVal0"));
        assertEquals(2, params.size());
    }

    @Test
    @DisplayName("No filter appends nothing")
    void appendsNothingWithoutFilters() {
        append(null);

        assertTrue(query.toString().isEmpty());
        assertTrue(params.isEmpty());
    }
}
