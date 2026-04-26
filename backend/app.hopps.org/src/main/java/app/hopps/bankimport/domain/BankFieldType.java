package app.hopps.bankimport.domain;

/**
 * Canonical target fields a CSV column can be mapped to. Schema mapping definitions reference these via
 * {@link BankCsvColumnMapping#targetField}.
 */
public enum BankFieldType {
    BOOKING_DATE,
    VALUE_DATE,
    AMOUNT,
    DEBIT_AMOUNT,
    CREDIT_AMOUNT,
    AMOUNT_TYPE_INDICATOR,
    CURRENCY,
    PURPOSE,
    COUNTERPARTY_NAME,
    COUNTERPARTY_IBAN,
    COUNTERPARTY_BIC,
    TRANSACTION_TYPE,
    BANK_REFERENCE,
    BALANCE_AFTER,
    END_TO_END_REFERENCE,
    MANDATE_REFERENCE,
    CREDITOR_ID
}
