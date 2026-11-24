package app.hopps.bankimport.service;

import app.hopps.bankimport.api.dto.BankCsvColumnMappingDto;
import app.hopps.bankimport.api.dto.BankCsvSchemaTemplateResponse;
import app.hopps.bankimport.domain.BankCsvColumnMapping;
import app.hopps.bankimport.domain.BankCsvSchema;
import app.hopps.bankimport.domain.BankFieldType;
import app.hopps.bankimport.parser.CsvParser;
import app.hopps.bankimport.parser.DateAmountParser;
import app.hopps.bankimport.parser.EncodingDetector;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Parses a made-up Commerzbank Umsatz-CSV with the settings of the {@code commerzbank-csv} template. The fixture has
 * the layout of the real export: 11 columns, counterparty in Sender (credits) or Empfänger (debits), and
 * Verwendungszweck empty on some rows. The real export is UTF-8 with BOM, so the fixture is also read with a BOM
 * prepended.
 */
class CommerzbankCsvTemplateTest {

    private static final String FIXTURE = "bankimport/commerzbank-csv-sample.csv";
    private static final byte[] UTF8_BOM = { (byte) 0xEF, (byte) 0xBB, (byte) 0xBF };

    private final BankCsvSchemaTemplateResponse template = new SystemTemplateService().requireById("commerzbank-csv");
    private final Map<BankFieldType, BankCsvColumnMapping> mappings = mappingsOf(template);

    @Test
    void parsesEveryRowOfTheFixture() throws IOException {
        assertParsesAllRows(readFixture());
    }

    @Test
    void parsesEveryRowWhenFileStartsWithBom() throws IOException {
        byte[] plain = readFixture();
        byte[] withBom = new byte[UTF8_BOM.length + plain.length];
        System.arraycopy(UTF8_BOM, 0, withBom, 0, UTF8_BOM.length);
        System.arraycopy(plain, 0, withBom, UTF8_BOM.length, plain.length);

        assertParsesAllRows(withBom);
    }

    @Test
    void readsCounterpartyFromSenderOnCreditsAndFromEmpfaengerOnDebits() throws IOException {
        List<List<String>> rows = parse(readFixture());

        assertEquals("Test Person 1", value(rows.get(0), BankFieldType.COUNTERPARTY_NAME));
        assertEquals("Testfirma GmbH", value(rows.get(1), BankFieldType.COUNTERPARTY_NAME));
        assertEquals("Test Person 2", value(rows.get(3), BankFieldType.COUNTERPARTY_NAME));
    }

    @Test
    void readsPurposeFromBuchungstextWhenVerwendungszweckIsEmpty() throws IOException {
        List<List<String>> rows = parse(readFixture());

        assertEquals("Mitgliedsbeitrag 2026", value(rows.get(0), BankFieldType.PURPOSE));
        assertEquals("Entgelt Kontoführung 10/2026", value(rows.get(2), BankFieldType.PURPOSE));
        assertEquals("Test Person 2 Spende Projekt", value(rows.get(3), BankFieldType.PURPOSE));
    }

    @Test
    void mapsFirstRowToExpectedValues() throws IOException {
        List<String> row = parse(readFixture()).getFirst();

        assertEquals(LocalDate.of(2026, 11, 3), date(row, BankFieldType.BOOKING_DATE));
        assertEquals(LocalDate.of(2026, 11, 3), date(row, BankFieldType.VALUE_DATE));
        assertEquals(new BigDecimal("25.00"), amount(row));
        assertEquals("EUR", value(row, BankFieldType.CURRENCY));
        assertEquals("Überweisung", value(row, BankFieldType.TRANSACTION_TYPE));
        assertNull(value(row, BankFieldType.COUNTERPARTY_IBAN));
    }

    @Test
    void readsAmountsWithOneDecimalAndWithoutThousandSeparator() throws IOException {
        List<List<String>> rows = parse(readFixture());

        assertEquals(0, new BigDecimal("-5.5").compareTo(amount(rows.get(2))));
        assertEquals(0, new BigDecimal("1250.00").compareTo(amount(rows.get(3))));
    }

    @Test
    void fallsBackWhenTheMappedColumnIsMissingFromTheRow() {
        // A file that ends after "Kategorie" (8 columns): no Sender / Empfänger / Verwendungszweck at all.
        List<String> row = List.of("03.11.2026", "03.11.2026", "Lastschrift", "Testfirma GmbH Rechnung 4711",
                "-19,90", "EUR", "DE89370400440532013000", "");

        assertEquals("Testfirma GmbH Rechnung 4711", value(row, BankFieldType.PURPOSE));
        assertNull(value(row, BankFieldType.COUNTERPARTY_NAME));
    }

    @Test
    void parsesFallbackColumnTransform() {
        assertEquals(8, SystemTemplateService.fallbackColumn("fallback-column:8"));
        assertNull(SystemTemplateService.fallbackColumn(SystemTemplateService.TRANSFORM_MT940_BLOB));
        assertNull(SystemTemplateService.fallbackColumn("fallback-column:x"));
        assertNull(SystemTemplateService.fallbackColumn("fallback-column:-1"));
        assertNull(SystemTemplateService.fallbackColumn(null));
    }

    private void assertParsesAllRows(byte[] bytes) {
        List<List<String>> rows = parse(bytes);

        assertEquals(5, rows.size());
        for (List<String> row : rows) {
            assertEquals(11, row.size());
            assertNotNull(date(row, BankFieldType.BOOKING_DATE));
            assertNotNull(date(row, BankFieldType.VALUE_DATE));
            assertNotNull(amount(row));
            assertNotNull(value(row, BankFieldType.COUNTERPARTY_NAME));
            assertNotNull(value(row, BankFieldType.PURPOSE));
        }
    }

    private List<List<String>> parse(byte[] bytes) {
        String text = EncodingDetector.decodeStrict(bytes, Charset.forName(template.encoding()));
        return CsvParser.parseAll(text, schemaFromTemplate());
    }

    private BankCsvSchema schemaFromTemplate() {
        BankCsvSchema schema = new BankCsvSchema();
        schema.setDelimiter(template.delimiter().charAt(0));
        schema.setQuoteChar(template.quoteChar().charAt(0));
        schema.setEncoding(template.encoding());
        schema.setSkipLines(template.skipLines());
        schema.setHasHeader(template.hasHeader());
        schema.setDateFormat(template.dateFormat());
        schema.setDecimalSeparator(template.decimalSeparator().charAt(0));
        return schema;
    }

    private static Map<BankFieldType, BankCsvColumnMapping> mappingsOf(BankCsvSchemaTemplateResponse template) {
        Map<BankFieldType, BankCsvColumnMapping> map = new EnumMap<>(BankFieldType.class);
        for (BankCsvColumnMappingDto dto : template.columnMappings()) {
            BankCsvColumnMapping mapping = new BankCsvColumnMapping();
            mapping.setTargetField(dto.targetField());
            mapping.setSourceColumnIndex(dto.sourceColumnIndex());
            mapping.setTransform(dto.transform());
            map.put(dto.targetField(), mapping);
        }
        return map;
    }

    /** Reads a field the way the importer does, including the fallback column. */
    private String value(List<String> row, BankFieldType field) {
        String value = CsvImportService.optional(row, mappings, field);
        return value == null || value.isEmpty() ? null : value;
    }

    private LocalDate date(List<String> row, BankFieldType field) {
        return DateAmountParser.parseDate(value(row, field), template.dateFormat());
    }

    private BigDecimal amount(List<String> row) {
        return DateAmountParser.parseAmount(value(row, BankFieldType.AMOUNT), template.decimalSeparator().charAt(0),
                null);
    }

    private byte[] readFixture() throws IOException {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream(FIXTURE)) {
            assertNotNull(in, "missing fixture " + FIXTURE);
            return in.readAllBytes();
        }
    }
}
