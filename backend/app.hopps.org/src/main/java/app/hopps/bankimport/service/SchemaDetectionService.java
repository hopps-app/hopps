package app.hopps.bankimport.service;

import app.hopps.bankimport.api.dto.BankCsvColumnMappingDto;
import app.hopps.bankimport.api.dto.BankCsvSchemaTemplateResponse;
import app.hopps.bankimport.api.dto.SchemaDetectionResult;
import app.hopps.bankimport.domain.BankCsvColumnMapping;
import app.hopps.bankimport.domain.BankCsvSchema;
import app.hopps.bankimport.repository.BankCsvSchemaRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Matches a list of CSV header columns against the org's existing schemas and the built-in system templates.
 * <p>
 * Matching is done in two passes:
 * <ol>
 * <li><b>Org schemas first</b> – scored by how many of the schema's mapped column indices fall within the header range
 * AND by name similarity between the header columns and the schema's column signatures (if any).</li>
 * <li><b>System templates</b> – each template carries a {@code headerSignature}: a set of expected column names. Score
 * = matched signature terms / total signature terms.</li>
 * </ol>
 * The best result above {@value #MIN_CONFIDENCE} is returned; otherwise {@link SchemaDetectionResult#none()}.
 */
@ApplicationScoped
public class SchemaDetectionService {

    static final double MIN_CONFIDENCE = 0.6;

    /** Known header-column signatures for each built-in template (lower-cased, trimmed). */
    private static final Map<String, Set<String>> TEMPLATE_SIGNATURES = Map.of(
            "sparkasse-mt940", Set.of(
                    "auftragskonto", "buchungstag", "valutadatum", "buchungstext",
                    "verwendungszweck", "betrag", "waehrung"),
            "sparkasse-camt-v2", Set.of(
                    "auftragskonto", "buchungstag", "valutadatum", "buchungstext",
                    "verwendungszweck", "glaeubiger id", "mandatsreferenz",
                    "betrag", "waehrung"),
            "sparkasse-camt-v8", Set.of(
                    "auftragskonto", "buchungstag", "valutadatum", "buchungstext",
                    "verwendungszweck", "glaeubiger id", "mandatsreferenz",
                    "betrag", "waehrung"));

    /**
     * Sparkasse CAMT v2 and v8 have identical headers. We prefer v8 (recommended) when both score equally. The
     * tiebreaker is handled by checking column count: v2 used abbreviated Buchungstext values but same columns. Without
     * further content analysis we default to v8 for any 17-column Sparkasse CAMT file.
     */
    private static final String CAMT_PREFERRED = "sparkasse-camt-v8";
    private static final String CAMT_OTHER = "sparkasse-camt-v2";

    @Inject
    BankCsvSchemaRepository schemaRepository;

    @Inject
    SystemTemplateService templateService;

    /**
     * Detects the best-matching schema for the given header columns.
     *
     * @param headerColumns
     *            CSV header row as parsed by the preview service (may be empty if the file has no header)
     *
     * @return best match, or {@link SchemaDetectionResult#none()} when nothing scores above the threshold
     */
    public SchemaDetectionResult detect(List<String> headerColumns) {
        if (headerColumns == null || headerColumns.isEmpty()) {
            return SchemaDetectionResult.none();
        }

        Set<String> normalised = headerColumns.stream()
                .map(h -> h.toLowerCase(Locale.ROOT).trim())
                .collect(Collectors.toSet());

        SchemaDetectionResult best = SchemaDetectionResult.none();

        // 1. Org schemas -------------------------------------------------------
        List<BankCsvSchema> orgSchemas = schemaRepository.listForCurrentOrganization(false);
        for (BankCsvSchema schema : orgSchemas) {
            double score = scoreOrgSchema(schema, headerColumns.size(), normalised);
            if (score > best.confidence()) {
                best = new SchemaDetectionResult(
                        SchemaDetectionResult.DetectionType.ORG,
                        schema.getId(),
                        null,
                        schema.getName(),
                        score);
            }
        }

        // 2. System templates --------------------------------------------------
        List<BankCsvSchemaTemplateResponse> templates = templateService.list();
        for (BankCsvSchemaTemplateResponse tpl : templates) {
            // Prefer v8 over v2 when both score identically
            if (CAMT_OTHER.equals(tpl.templateId())) {
                continue; // handled via CAMT_PREFERRED below
            }
            double score = scoreTemplate(tpl.templateId(), normalised);
            if (score > best.confidence()) {
                best = new SchemaDetectionResult(
                        SchemaDetectionResult.DetectionType.TEMPLATE,
                        null,
                        tpl.templateId(),
                        tpl.name(),
                        score);
            }
        }

        if (best.confidence() < MIN_CONFIDENCE) {
            return SchemaDetectionResult.none();
        }
        return best;
    }

    // ── scoring helpers ───────────────────────────────────────────────────────

    private double scoreOrgSchema(BankCsvSchema schema, int actualColumnCount, Set<String> normalisedHeaders) {
        List<BankCsvColumnMapping> mappings = schema.getColumnMappings();
        if (mappings.isEmpty()) {
            return 0.0;
        }
        // Derive expected column count from the highest mapped index
        int maxIndex = mappings.stream()
                .mapToInt(BankCsvColumnMapping::getSourceColumnIndex)
                .max()
                .orElse(0);
        int expectedColumnCount = maxIndex + 1;

        // Column count must be at least as large as the expected count
        if (actualColumnCount < expectedColumnCount) {
            return 0.0;
        }

        // Score by column-count proximity: exact match = 1.0, off-by-one = 0.8, etc.
        double countScore = actualColumnCount == expectedColumnCount ? 1.0
                : Math.max(0.0, 1.0 - 0.15 * Math.abs(actualColumnCount - expectedColumnCount));

        // Boost if the schema has a bankIdentifier and any header contains it
        double identifierBoost = 0.0;
        if (schema.getBankIdentifier() != null && !schema.getBankIdentifier().isBlank()) {
            String id = schema.getBankIdentifier().toLowerCase(Locale.ROOT);
            boolean headerMatch = normalisedHeaders.stream().anyMatch(h -> h.contains(id));
            identifierBoost = headerMatch ? 0.2 : 0.0;
        }

        return Math.min(1.0, countScore * 0.8 + identifierBoost);
    }

    private double scoreTemplate(String templateId, Set<String> normalisedHeaders) {
        Set<String> signature = TEMPLATE_SIGNATURES.get(templateId);
        if (signature == null || signature.isEmpty()) {
            return 0.0;
        }
        long matched = signature.stream()
                .filter(sig -> normalisedHeaders.stream().anyMatch(h -> h.contains(sig)))
                .count();
        return (double) matched / signature.size();
    }
}
