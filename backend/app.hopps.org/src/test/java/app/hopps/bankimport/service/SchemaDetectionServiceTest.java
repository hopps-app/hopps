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

    @Test
    void returnsNoneForUnrelatedHeaders() {
        SchemaDetectionResult result = service.detect(List.of("foo", "bar", "baz"));

        assertEquals(SchemaDetectionResult.DetectionType.NONE, result.type());
    }
}
