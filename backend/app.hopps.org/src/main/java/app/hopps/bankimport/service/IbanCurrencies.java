package app.hopps.bankimport.service;

import java.util.Locale;
import java.util.Set;

/**
 * The currency an account is kept in, judging by the country of its IBAN: Swiss and Liechtenstein IBANs mean CHF,
 * everything else EUR. Accounts in another currency than the organization (e.g. a euro account at a Swiss bank) are not
 * supported yet, because amounts are not converted: they would be added up in the organization's currency. Mirrors
 * {@code currencyForIban} in the SPA ({@code lib/currency.ts}).
 */
public final class IbanCurrencies {

    static final Set<String> FRANC_COUNTRIES = Set.of("CH", "LI");

    private IbanCurrencies() {
    }

    /** "CHF" for a Swiss or Liechtenstein IBAN, "EUR" for any other. */
    public static String currencyOf(String iban) {
        String country = iban == null || iban.length() < 2 ? "" : iban.substring(0, 2).toUpperCase(Locale.ROOT);
        return FRANC_COUNTRIES.contains(country) ? "CHF" : "EUR";
    }
}
