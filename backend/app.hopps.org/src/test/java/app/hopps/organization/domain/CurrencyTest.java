package app.hopps.organization.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CurrencyTest {

    @Test
    void swissAndLiechtensteinPayInFrancs() {
        assertEquals(Currency.CHF, Currency.forCountry("CH"));
        assertEquals(Currency.CHF, Currency.forCountry("li"));
    }

    @Test
    void everyOtherCountryPaysInEuros() {
        assertEquals(Currency.EUR, Currency.forCountry("DE"));
        assertEquals(Currency.EUR, Currency.forCountry("AT"));
        assertEquals(Currency.EUR, Currency.forCountry(null));
    }

    @Test
    void onlyEuroAndFrancCountriesAreSupported() {
        assertTrue(Currency.isSupportedCountry("DE"));
        assertTrue(Currency.isSupportedCountry("CH"));
        assertTrue(Currency.isSupportedCountry("bg"));
        assertFalse(Currency.isSupportedCountry("US"));
        assertFalse(Currency.isSupportedCountry("GB"));
        assertFalse(Currency.isSupportedCountry(null));
    }
}
