package app.hopps.audit.domain;

/**
 * The kind of record an audit entry is about. Links to bank transactions are recorded on the transaction they belong
 * to, so one entity's history is a single query.
 */
public enum AuditEntityType {
    TRANSACTION
}
