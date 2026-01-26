package app.hopps.transaction.domain;

/**
 * German nonprofit organization areas (Tätigkeitsbereiche). Used for categorizing transactions according to German
 * nonprofit law.
 */
public enum TransactionArea {
    /**
     * Ideeller Bereich - Non-profit activities (membership fees, donations).
     */
    IDEELL,

    /**
     * Zweckbetrieb - Purpose operations directly serving the nonprofit mission.
     */
    ZWECKBETRIEB,

    /**
     * Vermögensverwaltung - Asset management (interest, rental income).
     */
    VERMOEGENSVERWALTUNG,

    /**
     * Wirtschaftlicher Geschäftsbetrieb - Commercial business operations.
     */
    WIRTSCHAFTLICH
}
