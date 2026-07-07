package app.hopps.bankimport.service;

import app.hopps.bankimport.api.dto.BankCsvColumnMappingDto;
import app.hopps.bankimport.api.dto.BankCsvSchemaTemplateResponse;
import app.hopps.bankimport.domain.AmountStrategy;
import app.hopps.bankimport.domain.BankFieldType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.NotFoundException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Provides built-in {@link BankCsvSchemaTemplateResponse} definitions (Sparkasse MT940 / CAMT.052 v2 / CAMT.052 v8 in
 * the MVP). Templates are kept in code rather than the DB so they can be added/updated via deploy without a Flyway
 * migration. See bank-import-feature.md §2.3 and §4.3.
 */
@ApplicationScoped
public class SystemTemplateService {

    /** Marker used on the MT940 PURPOSE mapping. The parser splits the SVWZ blob into structured fields (Q12b). */
    public static final String TRANSFORM_MT940_BLOB = "mt940-blob";

    private final Map<String, BankCsvSchemaTemplateResponse> templates;

    public SystemTemplateService() {
        this.templates = new LinkedHashMap<>();
        register(buildSparkasseMt940());
        register(buildSparkasseCamtV2());
        register(buildSparkasseCamtV8());
    }

    public List<BankCsvSchemaTemplateResponse> list() {
        return List.copyOf(templates.values());
    }

    public Optional<BankCsvSchemaTemplateResponse> findById(String templateId) {
        return Optional.ofNullable(templates.get(templateId));
    }

    public BankCsvSchemaTemplateResponse requireById(String templateId) {
        return findById(templateId)
                .orElseThrow(() -> new NotFoundException("Unknown bank CSV template: " + templateId));
    }

    private void register(BankCsvSchemaTemplateResponse template) {
        templates.put(template.templateId(), template);
    }

    // -------------------------------------------------------------------------------------------
    // Sparkasse — MT940 (Legacy export, 11 columns, single SVWZ blob)
    // -------------------------------------------------------------------------------------------
    private BankCsvSchemaTemplateResponse buildSparkasseMt940() {
        // Column layout (0-based): 0=Auftragskonto, 1=Buchungstag, 2=Valutadatum, 3=Buchungstext,
        // 4=Verwendungszweck (MT940 blob), 5=Beguenstigter, 6=Kontonummer, 7=BLZ, 8=Betrag, 9=Waehrung, 10=Info
        List<BankCsvColumnMappingDto> mappings = List.of(
                map(BankFieldType.BOOKING_DATE, 1),
                map(BankFieldType.VALUE_DATE, 2),
                map(BankFieldType.TRANSACTION_TYPE, 3),
                // Single "Verwendungszweck" blob — Mt940PurposeParser splits SVWZ/EREF/MREF/CRED at import time.
                mapWithTransform(BankFieldType.PURPOSE, 4, TRANSFORM_MT940_BLOB),
                map(BankFieldType.COUNTERPARTY_NAME, 5),
                map(BankFieldType.COUNTERPARTY_IBAN, 6),
                map(BankFieldType.COUNTERPARTY_BIC, 7),
                map(BankFieldType.AMOUNT, 8),
                map(BankFieldType.CURRENCY, 9));

        return new BankCsvSchemaTemplateResponse(
                "sparkasse-mt940",
                "Sparkasse MT940 (Legacy)",
                "Sparkasse",
                "Älterer Sparkasse-Export im MT940-Stil. Verwendungszweck enthält EREF+/MREF+/CRED+/SVWZ+ in einer Spalte und wird automatisch zerlegt.",
                ";",
                "\"",
                "windows-1252",
                0,
                true,
                "dd.MM.yy",
                ",",
                null,
                AmountStrategy.SIGNED_SINGLE_COLUMN,
                List.of(),
                mappings);
    }

    // -------------------------------------------------------------------------------------------
    // Sparkasse — CAMT.052 v2 (17 columns, structured SEPA fields, abgekürzte Buchungstexte)
    // -------------------------------------------------------------------------------------------
    private BankCsvSchemaTemplateResponse buildSparkasseCamtV2() {
        List<BankCsvColumnMappingDto> mappings = camtV2OrV8Mappings();
        return new BankCsvSchemaTemplateResponse(
                "sparkasse-camt-v2",
                "Sparkasse CAMT.052 v2",
                "Sparkasse",
                "Sparkasse-Export im CAMT.052-Format Version 2. Strukturierte SEPA-Felder, abgekürzte Buchungstexte (z.B. \"GUTSCHR. UEBERWEISUNG\").",
                ";",
                "\"",
                "windows-1252",
                0,
                true,
                "dd.MM.yy",
                ",",
                null,
                AmountStrategy.SIGNED_SINGLE_COLUMN,
                List.of(),
                mappings);
    }

    // -------------------------------------------------------------------------------------------
    // Sparkasse — CAMT.052 v8 (17 columns, identical to v2, ausgeschriebene Buchungstexte). Recommended default.
    // -------------------------------------------------------------------------------------------
    private BankCsvSchemaTemplateResponse buildSparkasseCamtV8() {
        List<BankCsvColumnMappingDto> mappings = camtV2OrV8Mappings();
        return new BankCsvSchemaTemplateResponse(
                "sparkasse-camt-v8",
                "Sparkasse CAMT.052 v8 (empfohlen)",
                "Sparkasse",
                "Aktueller Sparkasse-Export im CAMT.052-Format Version 8. Strukturierte SEPA-Felder, ausgeschriebene Buchungstexte (z.B. \"GUTSCHRIFT UEBERWEISUNG\").",
                ";",
                "\"",
                "windows-1252",
                0,
                true,
                "dd.MM.yy",
                ",",
                null,
                AmountStrategy.SIGNED_SINGLE_COLUMN,
                List.of(),
                mappings);
    }

    private List<BankCsvColumnMappingDto> camtV2OrV8Mappings() {
        // Column layout (0-based): 0=Auftragskonto, 1=Buchungstag, 2=Valutadatum, 3=Buchungstext,
        // 4=Verwendungszweck, 5=GlaeubigerID, 6=Mandatsreferenz, 7=Kundenreferenz(End-to-End),
        // 8=Sammlerreferenz, 9=LastschriftUrsprungsbetrag, 10=AuslagenersatzRuecklastschrift,
        // 11=Beguenstigter, 12=Kontonummer/IBAN, 13=BIC, 14=Betrag, 15=Waehrung, 16=Info
        return List.of(
                map(BankFieldType.BOOKING_DATE, 1),
                map(BankFieldType.VALUE_DATE, 2),
                map(BankFieldType.TRANSACTION_TYPE, 3),
                map(BankFieldType.PURPOSE, 4),
                map(BankFieldType.CREDITOR_ID, 5),
                map(BankFieldType.MANDATE_REFERENCE, 6),
                map(BankFieldType.END_TO_END_REFERENCE, 7),
                map(BankFieldType.COUNTERPARTY_NAME, 11),
                map(BankFieldType.COUNTERPARTY_IBAN, 12),
                map(BankFieldType.COUNTERPARTY_BIC, 13),
                map(BankFieldType.AMOUNT, 14),
                map(BankFieldType.CURRENCY, 15));
    }

    private static BankCsvColumnMappingDto map(BankFieldType field, int index) {
        return new BankCsvColumnMappingDto(field, index, null, null);
    }

    private static BankCsvColumnMappingDto mapWithTransform(BankFieldType field, int index, String transform) {
        return new BankCsvColumnMappingDto(field, index, null, transform);
    }
}
