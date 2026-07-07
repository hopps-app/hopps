package app.hopps.bankimport.parser;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DateAmountParserTest {

    // ------------------------------------------------------------------ parseDate

    @Test
    void germanDotFormatFourDigitYear() {
        LocalDate date = DateAmountParser.parseDate("15.03.2024", "dd.MM.yyyy");
        assertEquals(LocalDate.of(2024, 3, 15), date);
    }

    @Test
    void sparkasseTwoDigitYearBeforePivot() {
        // "24" < 2050 → 2024
        LocalDate date = DateAmountParser.parseDate("01.01.24", "dd.MM.yy", 2050);
        assertEquals(LocalDate.of(2024, 1, 1), date);
    }

    @Test
    void sparkasseTwoDigitYearAtPivot() {
        // "50" >= 2050 → baseYear = 1951, so "50" → 1950
        LocalDate date = DateAmountParser.parseDate("31.12.50", "dd.MM.yy", 2050);
        assertEquals(LocalDate.of(1950, 12, 31), date);
    }

    @Test
    void sparkasseTwoDigitYearJustBelowPivot() {
        // "49" < 2050 → 2049
        LocalDate date = DateAmountParser.parseDate("15.06.49", "dd.MM.yy", 2050);
        assertEquals(LocalDate.of(2049, 6, 15), date);
    }

    @Test
    void isoFormat() {
        LocalDate date = DateAmountParser.parseDate("2024-07-04", "yyyy-MM-dd");
        assertEquals(LocalDate.of(2024, 7, 4), date);
    }

    @Test
    void nullValueThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> DateAmountParser.parseDate(null, "dd.MM.yyyy"));
    }

    @Test
    void emptyValueThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> DateAmountParser.parseDate("  ", "dd.MM.yyyy"));
    }

    @Test
    void unparsableDateThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> DateAmountParser.parseDate("not-a-date", "dd.MM.yyyy"));
    }

    @Test
    void blankPatternThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> DateAmountParser.parseDate("01.01.2024", ""));
    }

    // ------------------------------------------------------------------ parseAmount

    @Test
    void germanFormatCommaDecimalDotThousand() {
        BigDecimal amount = DateAmountParser.parseAmount("1.234,56", ',', '.');
        assertEquals(new BigDecimal("1234.56"), amount);
    }

    @Test
    void usFormatDotDecimalCommaThousand() {
        BigDecimal amount = DateAmountParser.parseAmount("1,234.56", '.', ',');
        assertEquals(new BigDecimal("1234.56"), amount);
    }

    @Test
    void negativeAmountWithSign() {
        BigDecimal amount = DateAmountParser.parseAmount("-99,50", ',', null);
        assertEquals(new BigDecimal("-99.50"), amount);
    }

    @Test
    void positiveAmountWithSign() {
        BigDecimal amount = DateAmountParser.parseAmount("+500,00", ',', null);
        assertEquals(new BigDecimal("+500.00"), amount);
    }

    @Test
    void noThousandSeparator() {
        BigDecimal amount = DateAmountParser.parseAmount("1234,56", ',', null);
        assertEquals(new BigDecimal("1234.56"), amount);
    }

    @Test
    void integerAmount() {
        BigDecimal amount = DateAmountParser.parseAmount("1000", '.', null);
        assertEquals(new BigDecimal("1000"), amount);
    }

    @Test
    void leadingAndTrailingWhitespace() {
        BigDecimal amount = DateAmountParser.parseAmount("  42,00  ", ',', null);
        assertEquals(new BigDecimal("42.00"), amount);
    }

    @Test
    void nullAmountThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> DateAmountParser.parseAmount(null, ',', null));
    }

    @Test
    void emptyAmountThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> DateAmountParser.parseAmount("", ',', null));
    }

    @Test
    void unexpectedCharacterThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> DateAmountParser.parseAmount("12x34,00", ',', null));
    }
}
