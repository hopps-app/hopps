package app.hopps.bankimport.service;

import app.hopps.bankimport.api.dto.SchemaDetectionResult;
import app.hopps.bankimport.repository.BankCsvSchemaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for header-based schema detection. The key case is that a Sparkasse CAMT file must not be mistaken for the
 * MT940 template: the MT940 header signature is a strict subset of the CAMT one, so both score 1.0 and the tie has to
 * be broken toward the more specific (CAMT) template — otherwise the amount is read from the wrong column and every row
 * fails to import.
 */
class SchemaDetectionServiceTest {

    private SchemaDetectionService service;

    @BeforeEach
    void setUp() {
        BankCsvSchemaRepository schemaRepository = mock(BankCsvSchemaRepository.class);
        when(schemaRepository.listForCurrentOrganization(false)).thenReturn(List.of());

        service = new SchemaDetectionService();
        service.schemaRepository = schemaRepository;
        service.templateService = new SystemTemplateService();
    }

    @Test
    void detectsCamtV8ForFullCamtHeaders() {
        List<String> headers = List.of(
                "Auftragskonto", "Buchungstag", "Valutadatum", "Buchungstext", "Verwendungszweck",
                "Glaeubiger ID", "Mandatsreferenz", "Kundenreferenz (End-to-End)", "Sammlerreferenz",
                "Lastschrift Ursprungsbetrag", "Auslagenersatz Ruecklastschrift",
                "Beguenstigter/Zahlungspflichtiger", "Kontonummer/IBAN", "BIC (SWIFT-Code)",
                "Betrag", "Waehrung", "Info");

        SchemaDetectionResult result = service.detect(headers);

        assertEquals(SchemaDetectionResult.DetectionType.TEMPLATE, result.type());
        assertEquals("sparkasse-camt-v8", result.templateId());
    }

    @Test
    void detectsMt940ForMt940Headers() {
        // MT940 export has no Glaeubiger-ID / Mandatsreferenz columns, so it scores below CAMT and MT940 wins.
        List<String> headers = List.of(
                "Auftragskonto", "Buchungstag", "Valutadatum", "Buchungstext", "Verwendungszweck",
                "Beguenstigter/Zahlungspflichtiger", "Kontonummer", "BLZ", "Betrag", "Waehrung", "Info");

        SchemaDetectionResult result = service.detect(headers);

        assertEquals(SchemaDetectionResult.DetectionType.TEMPLATE, result.type());
        assertEquals("sparkasse-mt940", result.templateId());
    }

    /** Header of the Umsatz-CSV (18 columns). */
    private static final List<String> CSV18_HEADERS = List.of(
            "Bezeichnung Auftragskonto", "IBAN Auftragskonto", "BIC Auftragskonto", "Bankname Auftragskonto",
            "Buchungstag", "Valutadatum", "Name Zahlungsbeteiligter", "IBAN Zahlungsbeteiligter",
            "BIC (SWIFT-Code) Zahlungsbeteiligter", "Buchungstext", "Verwendungszweck", "Betrag", "Waehrung",
            "Saldo nach Buchung", "Bemerkung", "Gekennzeichneter Umsatz", "Glaeubiger ID", "Mandatsreferenz");

    @Test
    void detectsCsv18ForOnlineBankingHeaders() {
        SchemaDetectionResult result = service.detect(CSV18_HEADERS);

        assertEquals(SchemaDetectionResult.DetectionType.TEMPLATE, result.type());
        assertEquals("umsatz-csv-18", result.templateId());
    }

    @Test
    void csv18TemplateMapsColumnsToTheRightHeaders() {
        var template = new SystemTemplateService().requireById("umsatz-csv-18");

        assertEquals("UTF-8", template.encoding());
        assertEquals("dd.MM.yyyy", template.dateFormat());
        assertEquals(CSV18_HEADERS.size(), 18);

        var expected = java.util.Map.of(
                app.hopps.bankimport.domain.BankFieldType.BOOKING_DATE, "Buchungstag",
                app.hopps.bankimport.domain.BankFieldType.VALUE_DATE, "Valutadatum",
                app.hopps.bankimport.domain.BankFieldType.COUNTERPARTY_NAME, "Name Zahlungsbeteiligter",
                app.hopps.bankimport.domain.BankFieldType.COUNTERPARTY_IBAN, "IBAN Zahlungsbeteiligter",
                app.hopps.bankimport.domain.BankFieldType.TRANSACTION_TYPE, "Buchungstext",
                app.hopps.bankimport.domain.BankFieldType.PURPOSE, "Verwendungszweck",
                app.hopps.bankimport.domain.BankFieldType.AMOUNT, "Betrag",
                app.hopps.bankimport.domain.BankFieldType.CURRENCY, "Waehrung",
                app.hopps.bankimport.domain.BankFieldType.CREDITOR_ID, "Glaeubiger ID",
                app.hopps.bankimport.domain.BankFieldType.MANDATE_REFERENCE, "Mandatsreferenz");

        for (var mapping : template.columnMappings()) {
            String header = expected.get(mapping.targetField());
            if (header != null) {
                assertEquals(header, CSV18_HEADERS.get(mapping.sourceColumnIndex()),
                        "wrong column index for " + mapping.targetField());
            }
        }
    }

    @Test
    void csv18TemplateDateFormatParsesFourDigitYears() {
        var template = new SystemTemplateService().requireById("umsatz-csv-18");

        var date = java.time.LocalDate.parse("17.09.2026",
                java.time.format.DateTimeFormatter.ofPattern(template.dateFormat()));

        assertEquals(java.time.LocalDate.of(2026, 9, 17), date);
    }

    @Test
    void returnsNoneForUnrelatedHeaders() {
        SchemaDetectionResult result = service.detect(List.of("foo", "bar", "baz"));

        assertEquals(SchemaDetectionResult.DetectionType.NONE, result.type());
    }
}
