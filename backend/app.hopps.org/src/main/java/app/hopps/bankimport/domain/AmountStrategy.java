package app.hopps.bankimport.domain;

/**
 * Strategy for how a CSV expresses the direction (incoming/outgoing) of a transaction. See bank-import-feature.md
 * §3.2.1 for details and examples.
 */
public enum AmountStrategy {
    /** One column with a signed amount, e.g. Sparkasse "-6,07" / "1380,00". */
    SIGNED_SINGLE_COLUMN,
    /** Two separate columns "Soll" (debit) and "Haben" (credit). */
    DEBIT_CREDIT_COLUMNS,
    /** One amount column plus a separate type indicator column ("S"/"H", "Lastschrift"/"Gutschrift", ...). */
    AMOUNT_PLUS_TYPE_COLUMN
}
