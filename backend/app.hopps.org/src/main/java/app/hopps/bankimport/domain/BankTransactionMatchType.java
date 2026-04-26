package app.hopps.bankimport.domain;

/**
 * How a {@link BankTransactionMatch} was created. AUTO_RULE and AUTO_AI are reserved for Phase 2.
 */
public enum BankTransactionMatchType {
    MANUAL,
    AUTO_RULE,
    AUTO_AI
}
