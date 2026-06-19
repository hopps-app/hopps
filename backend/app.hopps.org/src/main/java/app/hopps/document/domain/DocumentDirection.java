package app.hopps.document.domain;

/**
 * Direction of a document from the organization's perspective. Determines the sign of the transaction created when the
 * document is confirmed.
 */
public enum DocumentDirection {
    /**
     * Eingangsbeleg: received invoice/receipt, money flows out (expense, negative transaction).
     */
    INCOMING,
    /**
     * Ausgangsbeleg: issued invoice/receipt, money flows in (income, positive transaction).
     */
    OUTGOING
}
