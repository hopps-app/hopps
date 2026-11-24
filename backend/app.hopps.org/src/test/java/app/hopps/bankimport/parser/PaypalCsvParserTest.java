package app.hopps.bankimport.parser;

import app.hopps.bankimport.parser.PaypalCsvParser.Entry;
import app.hopps.bankimport.parser.PaypalCsvParser.Kind;
import app.hopps.bankimport.parser.PaypalCsvParser.Result;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Reads an anonymised PayPal activity export (German headers, UTF-8 with BOM). It holds a payment funded from the bank,
 * a received payment withdrawn to the bank, a received payment with a fee and a USD payment booked through its currency
 * conversion, whose rows PayPal appends at the end of the file.
 */
class PaypalCsvParserTest {

    private static final String FIXTURE = "bankimport/paypal-de-anon.csv";
    private static final String HEADER = "\"Datum\",\"Uhrzeit\",\"Zeitzone\",\"Beschreibung\",\"Währung\",\"Brutto\","
            + "\"Entgelt\",\"Netto\",\"Guthaben\",\"Transaktionscode\",\"Absender E-Mail-Adresse\",\"Name\","
            + "\"Name der Bank\",\"Bankkonto\",\"Versand- und Bearbeitungsgebühr\",\"Umsatzsteuer\","
            + "\"Rechnungsnummer\",\"Zugehöriger Transaktionscode\"\n";

    @Test
    void detectsThePaypalExport() throws IOException {
        assertTrue(PaypalCsvParser.isPaypal(readFixture()));
        assertTrue(PaypalCsvParser.isPaypal(HEADER.getBytes(StandardCharsets.UTF_8)));
        assertFalse(PaypalCsvParser.isPaypal("\"Buchungstag\";\"Betrag\"\n".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void booksEveryEuroMovementOnce() throws IOException {
        Result result = parseFixture();

        assertTrue(result.problems().isEmpty(), () -> "unexpected problems: " + result.problems());
        assertEquals(9, result.entries().size());
        assertEquals(3, count(result, Kind.TRANSFER));
        assertEquals(1, count(result, Kind.FEE));
        assertEquals(Set.of("EUR", "USD"), result.currencies());
        assertTrue(result.entries().stream().allMatch(e -> "EUR".equals(e.currency())));
    }

    /** The movements add up to PayPal's own balance after every single one of them. */
    @Test
    void runningBalanceMatchesPaypal() throws IOException {
        BigDecimal running = BigDecimal.ZERO;
        for (Entry entry : parseFixture().entries()) {
            running = running.add(entry.amount());
            assertNotNull(entry.balanceAfter(), entry.key());
            assertEquals(0, running.compareTo(entry.balanceAfter()), () -> "balance after " + entry.key());
        }
        assertEquals(0, new BigDecimal("2.00").compareTo(running));
    }

    @Test
    void marksTopUpsAndWithdrawalsAsTransfers() throws IOException {
        List<Entry> entries = parseFixture().entries();

        assertEquals(Kind.TRANSFER, byKey(entries, "3CC00000CC0000001").kind());
        assertEquals(Kind.TRANSFER, byKey(entries, "6FF00000FF0000004").kind());
        assertEquals(Kind.TRANSFER, byKey(entries, "7GG00000GG0000005").kind());
        assertEquals(Kind.PAYMENT, byKey(entries, "1AA00000AA0000001").kind());
    }

    @Test
    void takesTheFeeAsAMovementOfItsOwn() throws IOException {
        List<Entry> entries = parseFixture().entries();

        Entry payment = byKey(entries, "5EE00000EE0000003");
        Entry fee = byKey(entries, "5EE00000EE0000003:fee");
        assertEquals(new BigDecimal("120.00"), payment.amount());
        assertEquals(new BigDecimal("-2.15"), fee.amount());
        assertEquals(Kind.FEE, fee.kind());
        assertEquals("Beispiel Liga e.V.", payment.counterpartyName());
        assertEquals(LocalDate.of(2026, 10, 5), fee.bookingDate());
    }

    @Test
    void booksForeignCurrencyThroughItsConversion() throws IOException {
        Entry conversion = byKey(parseFixture().entries(), "9JJ00000JJ0000006");

        assertEquals(Kind.PAYMENT, conversion.kind());
        assertEquals(new BigDecimal("-3.59"), conversion.amount());
        assertEquals("John Example", conversion.counterpartyName());
        assertEquals("Handyzahlung (3,85 USD)", conversion.purpose());
    }

    @Test
    void usesInvoiceNumberAsPurpose() throws IOException {
        Entry payment = byKey(parseFixture().entries(), "1AA00000AA0000001");

        assertEquals("Rechnungsnr. R100001", payment.purpose());
        assertEquals("Musikdienst AB", payment.counterpartyName());
        assertEquals("PayPal Express-Zahlung", payment.transactionType());
    }

    @Test
    void reportsForeignCurrencyWithoutConversion() {
        String text = HEADER + "\"07.11.2026\",\"10:00:00\",\"Europe/Berlin\",\"Handyzahlung\",\"GBP\",\"5,00\","
                + "\"0,00\",\"5,00\",\"5,00\",\"3MM00000MM0000009\",\"anna@example.test\",\"Anna Beispiel\",\"\",\"\","
                + "\"0,00\",\"0,00\",\"\",\"\"\n";

        Result result = PaypalCsvParser.parse(text, "EUR");

        assertTrue(result.entries().isEmpty());
        assertEquals(1, result.problems().size());
        assertTrue(result.problems().getFirst().message().contains("GBP"));
    }

    @Test
    void rejectsTheEnglishExport() {
        String text = "\"Date\",\"Time\",\"TimeZone\",\"Name\",\"Type\",\"Status\",\"Currency\",\"Gross\",\"Fee\","
                + "\"Net\",\"Transaction ID\",\"Reference Txn ID\",\"Balance\"\n";

        assertTrue(PaypalCsvParser.isPaypal(text.getBytes(StandardCharsets.UTF_8)));
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> PaypalCsvParser.parse(text, "EUR"));
        assertTrue(e.getMessage().contains("Deutsch"));
    }

    private static long count(Result result, Kind kind) {
        return result.entries().stream().filter(e -> e.kind() == kind).count();
    }

    private static Entry byKey(List<Entry> entries, String key) {
        return entries.stream()
                .filter(e -> e.key().equals(key))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no entry " + key));
    }

    private static Result parseFixture() throws IOException {
        return PaypalCsvParser.parse(new String(readFixture(), StandardCharsets.UTF_8), "EUR");
    }

    private static byte[] readFixture() throws IOException {
        try (InputStream in = PaypalCsvParserTest.class.getClassLoader().getResourceAsStream(FIXTURE)) {
            assertNotNull(in, FIXTURE);
            return in.readAllBytes();
        }
    }
}
