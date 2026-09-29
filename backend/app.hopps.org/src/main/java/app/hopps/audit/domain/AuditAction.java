package app.hopps.audit.domain;

/**
 * What a user did to an audited record.
 */
public enum AuditAction {
    CREATE,
    /** Fields of the record were changed. */
    UPDATE,
    /** A draft transaction was confirmed, or a document was confirmed (which creates its transaction). */
    CONFIRM,
    /** A confirmed transaction was sent back to draft, or a document went back to review. */
    REOPEN,
    /** A bank transaction was linked to the record. */
    LINK,
    /** A bank transaction link was removed. */
    UNLINK,
    /** The part of a linked bank transaction that is used for the record was changed. */
    ALLOCATION_UPDATE,
    DELETE,
    /** The file of a document was replaced. */
    FILE_REPLACE,
    /** A user asked for a document to be analyzed again. */
    REANALYZE,
    /** The analysis of a document finished; lists the source and the fields it filled. */
    ANALYZE,
    /** The analysis of a document failed. */
    ANALYSIS_FAIL
}
