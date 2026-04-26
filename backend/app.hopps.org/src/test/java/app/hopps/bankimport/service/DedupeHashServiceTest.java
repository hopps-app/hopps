package app.hopps.bankimport.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class DedupeHashServiceTest {

    private final DedupeHashService service = new DedupeHashService();

    private static final LocalDate DATE = LocalDate.of(2024, 3, 1);
    private static final BigDecimal AMOUNT = new BigDecimal("99.50");
    private static final String IBAN = "DE89370400440532013000";

    @Test
    void sameInputProducesSameHash() {
        String h1 = service.computeHash(DATE, AMOUNT, IBAN, "EREF-001", null);
        String h2 = service.computeHash(DATE, AMOUNT, IBAN, "EREF-001", null);
        assertEquals(h1, h2);
    }

    @Test
    void differentAmountProducesDifferentHash() {
        String h1 = service.computeHash(DATE, AMOUNT, IBAN, "EREF-001", null);
        String h2 = service.computeHash(DATE, new BigDecimal("99.51"), IBAN, "EREF-001", null);
        assertNotEquals(h1, h2);
    }

    @Test
    void differentDateProducesDifferentHash() {
        String h1 = service.computeHash(DATE, AMOUNT, IBAN, "EREF-001", null);
        String h2 = service.computeHash(DATE.plusDays(1), AMOUNT, IBAN, "EREF-001", null);
        assertNotEquals(h1, h2);
    }

    @Test
    void erefBranchUsedWhenPresent() {
        // When endToEndReference is provided, it should be used (not purpose).
        // Two transactions with same EREF but different purpose → same hash.
        String h1 = service.computeHash(DATE, AMOUNT, IBAN, "EREF-999", "purpose A");
        String h2 = service.computeHash(DATE, AMOUNT, IBAN, "EREF-999", "purpose B");
        assertEquals(h1, h2);
    }

    @Test
    void purposeBranchUsedWhenErefAbsent() {
        // When no EREF, purpose is the discriminator.
        String h1 = service.computeHash(DATE, AMOUNT, IBAN, null, "Miete März");
        String h2 = service.computeHash(DATE, AMOUNT, IBAN, null, "Miete April");
        assertNotEquals(h1, h2);
    }

    @Test
    void purposeNormalizationMakesHashStable() {
        // Extra whitespace in purpose should collapse to the same hash.
        String h1 = service.computeHash(DATE, AMOUNT, IBAN, null, "Miete  März");
        String h2 = service.computeHash(DATE, AMOUNT, IBAN, null, "Miete März");
        assertEquals(h1, h2);
    }

    @Test
    void purposeCaseInsensitive() {
        String h1 = service.computeHash(DATE, AMOUNT, IBAN, null, "Miete März");
        String h2 = service.computeHash(DATE, AMOUNT, IBAN, null, "MIETE MÄRZ");
        assertEquals(h1, h2);
    }

    @Test
    void blankErefFallsBackToPurpose() {
        // Blank EREF should be treated the same as null EREF.
        String h1 = service.computeHash(DATE, AMOUNT, IBAN, "   ", "Miete");
        String h2 = service.computeHash(DATE, AMOUNT, IBAN, null, "Miete");
        assertEquals(h1, h2);
    }

    @Test
    void ibanNormalizedToUppercaseNoSpaces() {
        // IBAN with spaces or lowercase should hash the same as without.
        String h1 = service.computeHash(DATE, AMOUNT, "de89 3704 0044 0532 0130 00", null, "Test");
        String h2 = service.computeHash(DATE, AMOUNT, "DE89370400440532013000", null, "Test");
        assertEquals(h1, h2);
    }

    @Test
    void amountTrailingZerosIgnored() {
        // 99.50 and 99.500 should hash identically (stripTrailingZeros).
        String h1 = service.computeHash(DATE, new BigDecimal("99.50"), IBAN, null, "Test");
        String h2 = service.computeHash(DATE, new BigDecimal("99.500"), IBAN, null, "Test");
        assertEquals(h1, h2);
    }

    @Test
    void hashIs64HexChars() {
        String hash = service.computeHash(DATE, AMOUNT, IBAN, "EREF-001", null);
        assertNotNull(hash);
        assertEquals(64, hash.length());
    }

    @Test
    void nullFieldsHandledGracefully() {
        // All optional fields null → must not throw
        String hash = service.computeHash(null, null, null, null, null);
        assertNotNull(hash);
        assertEquals(64, hash.length());
    }

    // --- cross-format normalisation (MT940 vs CAMT.052) ---

    @Test
    void purposeNormalizationStripsAllWhitespace() {
        // MT940 concatenates tokens without spaces; CAMT adds spaces between them.
        String camt = service.computeHash(DATE, AMOUNT, IBAN, null, "Abrechnung 31.03.2026 siehe Anlage ");
        String mt940 = service.computeHash(DATE, AMOUNT, IBAN, null, "Abrechnung 31.03.2026siehe Anlage");
        assertEquals(camt, mt940);
    }

    @Test
    void purposeNormalizationEquatesTimeSeparators() {
        // Sparkasse KARTENZAHLUNG: CAMT uses "T09:33", MT940 blob uses "T09.33".
        String camt = service.computeHash(DATE, AMOUNT, IBAN, null, "2026-03-09T09:33 Debitk.1 Karte 3");
        String mt940 = service.computeHash(DATE, AMOUNT, IBAN, null, "2026-03-09T09.33Debitk.1Karte3");
        assertEquals(camt, mt940);
    }

    @Test
    void nonIbanAccountNumberNormalisedToEmpty() {
        // Sparkasse ENTGELTABSCHLUSS in CAMT has "0000000000" in the IBAN column; MT940 has empty.
        String camt = service.computeHash(DATE, AMOUNT, "0000000000", null, "Abrechnung");
        String mt940 = service.computeHash(DATE, AMOUNT, "", null, "Abrechnung");
        assertEquals(camt, mt940);
    }

    @Test
    void nonIbanAccountNumberDoesNotMatchRealIban() {
        String placeholder = service.computeHash(DATE, AMOUNT, "0000000000", null, "Test");
        String real = service.computeHash(DATE, AMOUNT, "DE89370400440532013000", null, "Test");
        assertNotEquals(placeholder, real);
    }
}
