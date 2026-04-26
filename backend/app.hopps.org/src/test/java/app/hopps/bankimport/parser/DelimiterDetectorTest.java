package app.hopps.bankimport.parser;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DelimiterDetectorTest {

    @Test
    void semicolonDelimited() {
        List<String> lines = List.of(
                "Datum;Betrag;Zweck",
                "01.01.2024;100,00;Miete",
                "02.01.2024;-50,00;Einkauf");
        assertEquals(';', DelimiterDetector.detect(lines));
    }

    @Test
    void commaDelimited() {
        List<String> lines = List.of(
                "Date,Amount,Purpose",
                "2024-01-01,100.00,Rent",
                "2024-01-02,-50.00,Shopping");
        assertEquals(',', DelimiterDetector.detect(lines));
    }

    @Test
    void tabDelimited() {
        List<String> lines = List.of(
                "Date\tAmount\tPurpose",
                "2024-01-01\t100.00\tRent",
                "2024-01-02\t-50.00\tShopping");
        assertEquals('\t', DelimiterDetector.detect(lines));
    }

    @Test
    void pipeDelimited() {
        List<String> lines = List.of(
                "Date|Amount|Purpose",
                "2024-01-01|100.00|Rent",
                "2024-01-02|-50.00|Shopping");
        assertEquals('|', DelimiterDetector.detect(lines));
    }

    @Test
    void nullInputDefaultsSemicolon() {
        assertEquals(';', DelimiterDetector.detect(null));
    }

    @Test
    void emptyListDefaultsSemicolon() {
        assertEquals(';', DelimiterDetector.detect(List.of()));
    }

    @Test
    void singleLineWithSemicolons() {
        assertEquals(';', DelimiterDetector.detect(List.of("a;b;c;d")));
    }

    @Test
    void inconsistentColumnCountDoesNotCrash() {
        // Different column counts per line — detector should still return something sensible
        List<String> lines = List.of(
                "a;b;c",
                "d;e",
                "f;g;h;i");
        char detected = DelimiterDetector.detect(lines);
        // At minimum it should not throw
        assertEquals(';', detected);
    }
}
