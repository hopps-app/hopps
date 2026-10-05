package app.hopps.bankimport.service;

import app.hopps.bankimport.api.dto.BankCsvColumnMappingDto;
import app.hopps.bankimport.api.dto.BankCsvSchemaTemplateResponse;
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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Parses an anonymised Volksbanken / Raiffeisenbanken (Atruvia) Umsatz-CSV export with the settings of the
 * {@code umsatz-csv-18} template. The real export is UTF-8 with BOM, so the fixture is read once as-is and once with a
 * BOM prepended.
 */
class UmsatzCsv18TemplateTest {

    private static final String FIXTURE = "bankimport/umsatz-csv-18-anon.csv";
    private static final byte[] UTF8_BOM = { (byte) 0xEF, (byte) 0xBB, (byte) 0xBF };

    private final BankCsvSchemaTemplateResponse template = new SystemTemplateService().requireById("umsatz-csv-18");
    private final Map<BankFieldType, Integer> columns = template.columnMappings()
            .stream()
            .collect(Collectors.toMap(BankCsvColumnMappingDto::targetField,
                    BankCsvColumnMappingDto::sourceColumnIndex));

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
    void mapsFirstRowToExpectedValues() throws IOException {
        List<String> row = parse(readFixture()).getFirst();

        assertEquals(LocalDate.of(2026, 9, 17), date(row, BankFieldType.BOOKING_DATE));
        assertEquals(new BigDecimal("168.10"), amount(row, BankFieldType.AMOUNT));
        assertEquals(new BigDecimal("1000.00"), amount(row, BankFieldType.BALANCE_AFTER));
        assertEquals("EUR", value(row, BankFieldType.CURRENCY));
        assertEquals("Test Person 1", value(row, BankFieldType.COUNTERPARTY_NAME));
        assertEquals("Überweisungsgutschr.", value(row, BankFieldType.TRANSACTION_TYPE));
        assertEquals("Verwendungszweck 1", value(row, BankFieldType.PURPOSE));
    }

    private void assertParsesAllRows(byte[] bytes) {
        List<List<String>> rows = parse(bytes);

        assertEquals(21, rows.size());
        for (List<String> row : rows) {
            assertEquals(18, row.size());
            assertNotNull(date(row, BankFieldType.BOOKING_DATE));
            assertNotNull(date(row, BankFieldType.VALUE_DATE));
            assertNotNull(amount(row, BankFieldType.AMOUNT));
            assertNotNull(amount(row, BankFieldType.BALANCE_AFTER));
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
        schema.setThousandSeparator(template.thousandSeparator().charAt(0));
        return schema;
    }

    private String value(List<String> row, BankFieldType field) {
        return row.get(columns.get(field));
    }

    private LocalDate date(List<String> row, BankFieldType field) {
        return DateAmountParser.parseDate(value(row, field), template.dateFormat());
    }

    private BigDecimal amount(List<String> row, BankFieldType field) {
        return DateAmountParser.parseAmount(value(row, field), template.decimalSeparator().charAt(0),
                template.thousandSeparator().charAt(0));
    }

    private byte[] readFixture() throws IOException {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream(FIXTURE)) {
            assertNotNull(in, "missing fixture " + FIXTURE);
            return in.readAllBytes();
        }
    }
}
