package app.hopps.audit.domain;

/**
 * What a user did to an audited record.
 */
public enum AuditAction {
    CREATE,
    /** Fields of the record were changed. */
    UPDATE,
    /** A draft transaction was confirmed. */
    CONFIRM,
    /** A confirmed transaction was sent back to draft. */
    REOPEN,
    /** A bank transaction was linked to the record. */
    LINK,
    /** A bank transaction link was removed. */
    UNLINK,
    /** The part of a linked bank transaction that is used for the record was changed. */
    ALLOCATION_UPDATE,
    DELETE
}
