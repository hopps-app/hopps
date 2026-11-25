package app.hopps.bankimport.domain;

/**
 * Where the movements of a {@link BankAccount} come from, and so how they are imported.
 */
public enum BankAccountType {
    /** An ordinary bank account, imported from CSV (via a schema) or MT940 statements. */
    BANK,
    /**
     * A Pleo card account, imported from Pleo's expense export. Each expense becomes a movement with a ready draft
     * booking, its receipt and its category.
     */
    PLEO
}
