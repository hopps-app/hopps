package app.hopps.bankimport.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class IbanCurrenciesTest {

    @Test
    void swissAndLiechtensteinIbansAreFrancs() {
        assertEquals("CHF", IbanCurrencies.currencyOf("CH9300762011623852957"));
        assertEquals("CHF", IbanCurrencies.currencyOf("LI21088100002324013AA"));
        assertEquals("CHF", IbanCurrencies.currencyOf("ch9300762011623852957"));
    }

    @Test
    void everyOtherIbanIsEuro() {
        assertEquals("EUR", IbanCurrencies.currencyOf("DE89370400440532013000"));
        assertEquals("EUR", IbanCurrencies.currencyOf("AT611904300234573201"));
        assertEquals("EUR", IbanCurrencies.currencyOf("GB29NWBK60161331926819"));
        assertEquals("EUR", IbanCurrencies.currencyOf(null));
    }
}
