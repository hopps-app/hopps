package app.hopps.audit.service;

import app.hopps.audit.domain.AuditEntityType;

import java.util.Map;

/**
 * What the audit trail needs to know about one kind of entity. Every audited entity gets an implementation, next to the
 * entity in its own feature package; it also holds the actions that only that entity has (a transaction is confirmed
 * and linked to bank transactions, for instance). {@link AuditService} does the writing that is the same for all of
 * them.
 *
 * @param <T>
 *            the audited entity
 */
public interface EntityAuditor<T> {

    AuditEntityType entityType();

    Long entityId(T entity);

    /** The organization the entity belongs to; null if it has none. */
    Long organizationId(T entity);

    /**
     * The audited state as plain JSON values (strings, booleans, numbers, lists and maps only), so two snapshots can be
     * compared with {@code equals} and stored as they are. Take one before applying a change and hand it to
     * {@link AuditService#updated} afterwards.
     */
    Map<String, Object> snapshot(T entity);
}
