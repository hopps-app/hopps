package app.hopps.audit.service;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Compares two snapshots of the same record.
 */
public final class AuditDiff {

    private AuditDiff() {
    }

    /**
     * The fields whose value differs, as {@code field -> {old, new}}; empty when nothing changed. A field that is
     * missing on one side counts as null there.
     */
    public static Map<String, Object> diff(Map<String, Object> before, Map<String, Object> after) {
        Set<String> fields = new LinkedHashSet<>(before.keySet());
        fields.addAll(after.keySet());

        Map<String, Object> changes = new LinkedHashMap<>();
        for (String field : fields) {
            Object oldValue = before.get(field);
            Object newValue = after.get(field);
            if (!Objects.equals(oldValue, newValue)) {
                changes.put(field, change(oldValue, newValue));
            }
        }
        return changes;
    }

    /** One changed value as {@code {old, new}}. */
    public static Map<String, Object> change(Object oldValue, Object newValue) {
        Map<String, Object> change = new LinkedHashMap<>();
        change.put("old", oldValue);
        change.put("new", newValue);
        return change;
    }
}
