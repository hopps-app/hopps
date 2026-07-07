package app.hopps.bankimport.parser;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class Mt940PurposeParserTest {

    @Test
    void nullInput() {
        var result = Mt940PurposeParser.parse(null);
        assertNull(result.purpose());
        assertNull(result.endToEndReference());
        assertNull(result.mandateReference());
        assertNull(result.creditorId());
    }

    @Test
    void blankInput() {
        var result = Mt940PurposeParser.parse("   ");
        assertNull(result.purpose());
        assertNull(result.endToEndReference());
        assertNull(result.mandateReference());
        assertNull(result.creditorId());
    }

    @Test
    void plainTextNoBlobTags() {
        var result = Mt940PurposeParser.parse("Miete März 2024");
        assertEquals("Miete März 2024", result.purpose());
        assertNull(result.endToEndReference());
        assertNull(result.mandateReference());
        assertNull(result.creditorId());
    }

    @Test
    void svwzOnly() {
        var result = Mt940PurposeParser.parse("SVWZ+Vereinsbeitrag Frühjahr");
        assertEquals("Vereinsbeitrag Frühjahr", result.purpose());
        assertNull(result.endToEndReference());
        assertNull(result.mandateReference());
        assertNull(result.creditorId());
    }

    @Test
    void erefAndSvwz() {
        var result = Mt940PurposeParser.parse("EREF+ABC123SVWZ+Spende Weihnachten");
        assertEquals("Spende Weihnachten", result.purpose());
        assertEquals("ABC123", result.endToEndReference());
        assertNull(result.mandateReference());
        assertNull(result.creditorId());
    }

    @Test
    void fullSepaBlob() {
        var result = Mt940PurposeParser.parse("EREF+E001MREF+M001CRED+DE12ABC345SVWZ+Lastschrift Mitglied");
        assertEquals("Lastschrift Mitglied", result.purpose());
        assertEquals("E001", result.endToEndReference());
        assertEquals("M001", result.mandateReference());
        assertEquals("DE12ABC345", result.creditorId());
    }

    @Test
    void preambleBeforeFirstTag() {
        // Some banks prepend free text before the first structured tag.
        var result = Mt940PurposeParser.parse("Sonstiges SVWZ+Zahlung fuer Rechnung 99");
        assertEquals("Zahlung fuer Rechnung 99", result.purpose());
        assertNull(result.endToEndReference());
    }

    @Test
    void preambleUsedAsPurposeWhenNoSvwz() {
        var result = Mt940PurposeParser.parse("Preamble text EREF+E999MREF+M999");
        assertEquals("Preamble text", result.purpose());
        assertEquals("E999", result.endToEndReference());
        assertEquals("M999", result.mandateReference());
    }

    @Test
    void emptyTagValueSkipped() {
        // MREF+ is immediately followed by another tag → empty value → should be null
        var result = Mt940PurposeParser.parse("MREF+SVWZ+some purpose");
        assertEquals("some purpose", result.purpose());
        assertNull(result.mandateReference());
    }

    @Test
    void ignoredTagsAbwaKrefIbanBic() {
        // ABWA / KREF / IBAN / BIC should be silently ignored (no NPE, no wrong assignment).
        var result = Mt940PurposeParser.parse("SVWZ+Real purposeABWA+somethingKREF+kref1");
        assertEquals("Real purpose", result.purpose());
        assertNull(result.endToEndReference());
        assertNull(result.mandateReference());
        assertNull(result.creditorId());
    }

    @Test
    void trailingWhitespaceStripped() {
        var result = Mt940PurposeParser.parse("SVWZ+Purpose with trailing   ");
        assertEquals("Purpose with trailing", result.purpose());
    }
}
