package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankCsvColumnMapping;
import app.hopps.bankimport.domain.BankCsvSchema;
import app.hopps.bankimport.domain.BankFieldType;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ImportFileCheckServiceTest {

    // ---------------------------------------------------------------------------------------------
    // verify
    // ---------------------------------------------------------------------------------------------

    @Test
    void acceptsFileInAccountCurrency() {
        assertDoesNotThrow(() -> ImportFileCheckService.verify("EUR", Set.of("EUR")));
    }

    @Test
    void acceptsFileWithoutCurrency() {
        assertDoesNotThrow(() -> ImportFileCheckService.verify("CHF", Set.of()));
    }

    @Test
    void rejectsOtherCurrency() {
        BankImportRejectedException e = assertThrows(BankImportRejectedException.class,
                () -> ImportFileCheckService.verify("CHF", Set.of("EUR")));

        Response response = e.getResponse();
        assertEquals(409, response.getStatus());
        Map<?, ?> body = (Map<?, ?>) response.getEntity();
        assertEquals(BankImportRejectedException.CURRENCY_MISMATCH, body.get("code"));
        assertEquals(List.of("EUR"), body.get("fileCurrencies"));
        assertEquals("CHF", body.get("accountCurrency"));
    }

    @Test
    void rejectsMixedCurrenciesEvenIfOneMatches() {
        assertThrows(BankImportRejectedException.class,
                () -> ImportFileCheckService.verify("EUR", Set.of("CHF", "EUR")));
    }

    // ---------------------------------------------------------------------------------------------
    // reading the currencies
    // ---------------------------------------------------------------------------------------------

    @Test
    void csvReadsMappedCurrencyColumn() {
        String csv = """
                "Auftragskonto";"Buchungstag";"Betrag";"Waehrung"
                "DE02120300000000202051";"15.07.26";"-163,90";"eur"
                "DE02120300000000202051";"14.07.26";"540,00";" EUR "
                """;

        assertEquals(Set.of("EUR"),
                ImportFileCheckService.currenciesOfCsv(csv, schema(mapping(BankFieldType.CURRENCY, 3))));
    }

    @Test
    void csvWithoutCurrencyColumnYieldsNothing() {
        String csv = """
                "Buchungstag";"Betrag"
                "15.07.26";"-163,90"
                """;

        assertEquals(Set.of(), ImportFileCheckService.currenciesOfCsv(csv, schema()));
    }

    @Test
    void mt940ReadsCurrencyFromOpeningBalance() {
        String mt940 = """
                :20:STARTUMS
                :25:DE02120300000000202051
                :28C:00001/001
                :60F:C250602CHF100,00
                :61:2506020602CR59,99NTRFNONREF
                :86:?20Spende
                :62F:C250602CHF159,99
                -
                """;

        assertEquals(Set.of("CHF"), ImportFileCheckService.currenciesOfMt940(mt940));
    }

    // ---------------------------------------------------------------------------------------------
    // helpers
    // ---------------------------------------------------------------------------------------------

    private static BankCsvSchema schema(BankCsvColumnMapping... mappings) {
        BankCsvSchema schema = new BankCsvSchema();
        schema.setDelimiter(';');
        schema.setQuoteChar('"');
        schema.setHasHeader(true);
        schema.setColumnMappings(List.of(mappings));
        return schema;
    }

    private static BankCsvColumnMapping mapping(BankFieldType field, int index) {
        BankCsvColumnMapping mapping = new BankCsvColumnMapping();
        mapping.setTargetField(field);
        mapping.setSourceColumnIndex(index);
        return mapping;
    }
}
