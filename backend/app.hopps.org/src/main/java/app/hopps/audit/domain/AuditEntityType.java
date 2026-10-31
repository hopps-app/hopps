package app.hopps.audit.domain;

/**
 * The kind of record an audit entry is about. Links to bank transactions are recorded on the transaction they belong
 * to, so one entity's history is a single query.
 */
public enum AuditEntityType {
    TRANSACTION,
    /** A bank movement: ignoring it and taking that back. */
    BANK_TRANSACTION,
    /** A bank statement import: deleting it, together with its bank movements. */
    BANK_IMPORT,
    /** A receipt (Beleg). */
    DOCUMENT
}
