package app.hopps.organization.domain;

import java.util.Locale;
import java.util.Set;

/**
 * Currencies an organization can keep its books in. Deliberately a short list: every amount in hopps is displayed in
 * the organization's currency, so adding one here is a product decision, not a data-entry option.
 * <p>
 * Organizations can only be registered in a country of one of these currencies: the euro area, or Switzerland and
 * Liechtenstein for the franc. Mirrors {@code lib/currency.ts} in the SPA.
 */
public enum Currency {
    EUR,
    CHF;

    /** ISO 3166 codes of the countries that pay in Swiss francs. */
    static final Set<String> FRANC_COUNTRIES = Set.of("CH", "LI");

    /** ISO 3166 codes of the euro area. */
    static final Set<String> EURO_COUNTRIES = Set.of(
            "AT", "BE", "BG", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL",
            "PT", "SI", "SK");

    /** Whether organizations from this country can be registered. */
    public static boolean isSupportedCountry(String country) {
        return country != null
                && (FRANC_COUNTRIES.contains(normalize(country)) || EURO_COUNTRIES.contains(normalize(country)));
    }

    /** CHF for Switzerland and Liechtenstein, EUR for every other country. */
    public static Currency forCountry(String country) {
        return country != null && FRANC_COUNTRIES.contains(normalize(country)) ? CHF : EUR;
    }

    private static String normalize(String country) {
        return country.trim().toUpperCase(Locale.ROOT);
    }
}
