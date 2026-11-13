package app.hopps.bankimport.domain;

/**
 * What kind of account a {@link BankAccount} is. It decides how the account is identified and which imports fit it.
 */
public enum BankAccountType {
    /** A bank account, identified by its IBAN. Imports CSV and MT940 statements. */
    BANK,
    /** A PayPal account, identified by the PayPal login email. Has no IBAN and imports the PayPal activity CSV. */
    PAYPAL
}
