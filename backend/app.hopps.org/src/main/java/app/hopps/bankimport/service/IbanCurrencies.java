package app.hopps.bankimport.service;

import app.hopps.organization.domain.Currency;

/**
 * The currency an account is kept in, judging by the country of its IBAN (its first two letters): Swiss and
 * Liechtenstein IBANs mean CHF, everything else EUR (see {@link Currency#forCountry}). Accounts in another currency
 * than the organization (e.g. a euro account at a Swiss bank) are not supported yet, because amounts are not converted:
 * they would be added up in the organization's currency.
 */
public final class IbanCurrencies {

    private IbanCurrencies() {
    }

    /** "CHF" for a Swiss or Liechtenstein IBAN, "EUR" for any other. */
    public static String currencyOf(String iban) {
        String country = iban == null || iban.length() < 2 ? null : iban.substring(0, 2);
        return Currency.forCountry(country).name();
    }
}
