package app.hopps.bankimport.parser;

import app.hopps.bankimport.parser.PleoCsvParser.PleoExpense;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PleoCsvParserTest {

    private static final String HEADER = "\"Date\",\"Receipt\",\"Expense Type\",\"Amount\",\"Net Amount\",\"Currency\","
            + "\"Source description\",\"Category\",\"Owner\",\"Note\",\"Expense ID\"\n";

    private static PleoCsvParser.Result parse(String csv) {
        return PleoCsvParser.parse(csv.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void readsAnExpenseByColumnName() {
        var result = parse("﻿" + HEADER
                + "\"21-04-2026\",\"1000014\",\"Online Card Purchase\",\"-17,94\",\"\",\"EUR\",\"UBER TRIP\","
                + "\"Transportfahrt \",\"Erika Muster\",\"Fahrt zum Termin \",\"exp-1\"\n");

        assertTrue(result.errors().isEmpty());
        PleoExpense expense = result.expenses().get(0);
        assertEquals(2, expense.rowNumber());
        assertEquals(LocalDate.of(2026, 4, 21), expense.date());
        assertEquals(new BigDecimal("-17.94"), expense.amount());
        assertEquals("EUR", expense.currency());
        assertEquals("UBER TRIP", expense.merchant());
        assertEquals("Transportfahrt", expense.category());
        assertEquals("Fahrt zum Termin", expense.note());
        assertEquals("1000014", expense.receiptNumber());
        assertEquals("exp-1", expense.expenseId());
        assertEquals("Erika Muster", expense.owner());
    }

    @Test
    void blankCellsAreNull() {
        var result = parse(
                HEADER + "\"24-04-2026\",\"\",\"Pleo Invoice\",\"-56,25\",\"\",\"EUR\",\"PLEO\",\"\",\"\",\"\","
                        + "\"exp-3\"\n");

        PleoExpense expense = result.expenses().get(0);
        assertNull(expense.category());
        assertNull(expense.note());
        assertNull(expense.receiptNumber());
    }

    @Test
    void readsSemicolonExportsAndOtherFormats() {
        var result = parse("Date;Amount;Currency;Expense ID\n2026-04-03;-1.200,50;eur;a\n03.04.2026;17.94;EUR;b\n");

        assertEquals(List.of(new BigDecimal("-1200.50"), new BigDecimal("17.94")),
                result.expenses().stream().map(PleoExpense::amount).toList());
        assertTrue(result.expenses().stream().allMatch(e -> e.date().equals(LocalDate.of(2026, 4, 3))));
        assertEquals("EUR", result.expenses().get(0).currency());
    }

    @Test
    void reportsUnreadableRowsAndKeepsTheRest() {
        var result = parse("Date,Amount\n31-02-2026,1\n01-04-2026,abc\n02-04-2026,\"-5,00\"\n");

        assertEquals(1, result.expenses().size());
        assertEquals(List.of(2, 3), result.errors().stream().map(PleoCsvParser.RowError::rowNumber).toList());
    }

    @Test
    void rejectsAFileWithoutTheRequiredColumns() {
        var error = assertThrows(PleoCsvParser.NotAPleoExportException.class,
                () -> parse("Buchungstag;Betrag\n01.04.2026;5\n"));
        assertEquals(List.of("Date", "Amount"), error.getMissingColumns());
    }

    @Test
    void amountsWithThousandSeparators() {
        assertEquals(new BigDecimal("1234.56"), PleoCsvParser.parseAmount("1,234.56"));
        assertEquals(new BigDecimal("-1234.56"), PleoCsvParser.parseAmount("-1.234,56"));
        assertEquals(new BigDecimal("1234567"), PleoCsvParser.parseAmount("1.234.567"));
        assertEquals(new BigDecimal("656.10"), PleoCsvParser.parseAmount("656,10"));
    }
}
