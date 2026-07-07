package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.AmountStrategy;
import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankCsvColumnMapping;
import app.hopps.bankimport.domain.BankCsvSchema;
import app.hopps.bankimport.domain.BankFieldType;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.parser.CsvParser;
import app.hopps.bankimport.parser.DateAmountParser;
import app.hopps.bankimport.parser.EncodingDetector;
import app.hopps.bankimport.parser.Mt940PurposeParser;
import app.hopps.bankimport.repository.BankTransactionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Orchestrates a single CSV import job: load file → decode → parse rows → map → persist {@link BankTransaction}s.
 * Errors at row-level are skipped and reported (Q15); fatal errors (encoding, schema mismatch) abort the whole job with
 * status {@link BankImportStatus#FAILED}. Designed to be called by {@code BankImportWorker} from a single background
 * thread.
 */
@ApplicationScoped
public class CsvImportService {

    private static final Logger LOG = LoggerFactory.getLogger(CsvImportService.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    /** Cap on the number of error rows reported back; everything past this is just counted. */
    private static final int MAX_REPORTED_ERRORS = 500;
    /** Hard ceiling for one import (Q risk table — large jahresabzüge). */
    private static final int MAX_ROWS = 5000;

    @Inject
    BankTransactionRepository transactionRepository;

    @Inject
    DedupeHashService dedupeHashService;

    @Inject
    ImportFileStorageService fileStorage;

    /**
     * Runs the full import pipeline for a {@link BankImport} that the worker just claimed (status=PROCESSING). Persists
     * the finished status (COMPLETED / PARTIAL / FAILED) before returning.
     */
    @Transactional
    public void runImport(Long importId) {
        BankImport job = BankImport.findById(importId);
        if (job == null) {
            LOG.warn("BankImport {} not found, skipping", importId);
            return;
        }
        BankAccount account = job.getBankAccount();
        BankCsvSchema schema = job.getSchema();

        ArrayNode errors = JSON.createArrayNode();
        int totalRows = 0;
        int importedRows = 0;
        int duplicateRows = 0;
        int errorRows = 0;

        try {
            byte[] bytes = fileStorage.readImportFile(job.getS3FileKey());
            String text = decode(bytes, schema.getEncoding());

            List<List<String>> rows = CsvParser.parseAll(text, schema);
            totalRows = rows.size();
            if (totalRows > MAX_ROWS) {
                fail(job, "Datei enthält " + totalRows + " Zeilen — Maximum sind " + MAX_ROWS);
                return;
            }

            Map<BankFieldType, BankCsvColumnMapping> mappingByField = indexMappings(schema);
            Set<String> positiveIndicators = parsePositiveIndicators(schema.getAmountTypePositiveValues());
            Set<String> dedupeHashes = new HashSet<>();

            // First pass: parse + dedupe-hash the rows so we can run a single batched DB lookup.
            ParsedRow[] parsed = new ParsedRow[rows.size()];
            for (int i = 0; i < rows.size(); i++) {
                int rowNumber = i + 1 + (schema.isHasHeader() ? 1 : 0) + schema.getSkipLines();
                List<String> row = rows.get(i);
                try {
                    parsed[i] = parseRow(row, schema, mappingByField, positiveIndicators);
                    parsed[i] = parsed[i].withDedupeHash(dedupeHashService.computeHash(
                            parsed[i].bookingDate(),
                            parsed[i].amount(),
                            parsed[i].counterpartyIban(),
                            parsed[i].endToEndReference(),
                            parsed[i].purpose()));
                    dedupeHashes.add(parsed[i].dedupeHash());
                } catch (Exception rowError) {
                    parsed[i] = null;
                    errorRows++;
                    appendError(errors, rowNumber, row, rowError.getMessage());
                }
            }

            Set<String> existing = transactionRepository.findExistingDedupeHashes(account.getId(), dedupeHashes);

            // Second pass: persist non-duplicate rows, deduplicate within the file too (same hash twice in one CSV).
            Set<String> seenInThisImport = new HashSet<>();
            for (int i = 0; i < parsed.length; i++) {
                ParsedRow pr = parsed[i];
                if (pr == null) {
                    continue;
                }
                if (existing.contains(pr.dedupeHash()) || !seenInThisImport.add(pr.dedupeHash())) {
                    duplicateRows++;
                    continue;
                }

                BankTransaction tx = new BankTransaction();
                tx.setOrganization(account.getOrganization());
                tx.setBankAccount(account);
                tx.setBankImport(job);
                tx.setBookingDate(pr.bookingDate());
                tx.setValueDate(pr.valueDate());
                tx.setAmount(pr.amount());
                tx.setCurrency(pr.currency() != null ? pr.currency() : account.getCurrency());
                tx.setPurpose(pr.purpose());
                tx.setCounterpartyName(pr.counterpartyName());
                tx.setCounterpartyIban(pr.counterpartyIban());
                tx.setCounterpartyBic(pr.counterpartyBic());
                tx.setTransactionType(pr.transactionType());
                tx.setBankReference(pr.bankReference());
                tx.setEndToEndReference(pr.endToEndReference());
                tx.setMandateReference(pr.mandateReference());
                tx.setCreditorId(pr.creditorId());
                tx.setBalanceAfter(pr.balanceAfter());
                tx.setRawRow(String.join(";", rows.get(i)));
                tx.setDedupeHash(pr.dedupeHash());
                tx.persist();
                importedRows++;

                if ((importedRows + duplicateRows + errorRows) % 50 == 0) {
                    job.setProgress(percent(importedRows + duplicateRows + errorRows, totalRows));
                    job.setImportedRows(importedRows);
                    job.setDuplicateRows(duplicateRows);
                    job.setErrorRows(errorRows);
                }
            }

            job.setTotalRows(totalRows);
            job.setImportedRows(importedRows);
            job.setDuplicateRows(duplicateRows);
            job.setErrorRows(errorRows);
            job.setProgress(100);
            job.setFinishedAt(Instant.now());
            if (errors.size() > 0) {
                ObjectNode report = JSON.createObjectNode();
                report.set("errors", errors);
                job.setErrorReport(report.toString());
            }
            job.setStatus(errorRows > 0 ? BankImportStatus.PARTIAL : BankImportStatus.COMPLETED);
            LOG.info("Import {} done: total={}, imported={}, duplicate={}, error={}",
                    importId, totalRows, importedRows, duplicateRows, errorRows);

        } catch (RuntimeException fatal) {
            LOG.error("Import {} failed", importId, fatal);
            fail(job, fatal.getMessage());
        }
    }

    private void fail(BankImport job, String reason) {
        job.setStatus(BankImportStatus.FAILED);
        job.setFailureReason(reason);
        job.setFinishedAt(Instant.now());
    }

    private static Map<BankFieldType, BankCsvColumnMapping> indexMappings(BankCsvSchema schema) {
        EnumMap<BankFieldType, BankCsvColumnMapping> map = new EnumMap<>(BankFieldType.class);
        for (BankCsvColumnMapping m : schema.getColumnMappings()) {
            map.put(m.getTargetField(), m);
        }
        return map;
    }

    private static Set<String> parsePositiveIndicators(String csv) {
        if (csv == null || csv.isBlank()) {
            return Set.of();
        }
        Set<String> set = new HashSet<>();
        for (String s : csv.split(",")) {
            String trimmed = s.trim();
            if (!trimmed.isEmpty()) {
                set.add(trimmed.toLowerCase(Locale.ROOT));
            }
        }
        return set;
    }

    private static String decode(byte[] bytes, String encoding) {
        Charset charset = Charset.forName(encoding);
        return EncodingDetector.decodeStrict(bytes, charset);
    }

    private static int percent(int done, int total) {
        return total == 0 ? 100 : Math.min(99, (int) ((done * 100L) / total));
    }

    private void appendError(ArrayNode errors, int rowNumber, List<String> row, String message) {
        if (errors.size() >= MAX_REPORTED_ERRORS) {
            return;
        }
        ObjectNode entry = JSON.createObjectNode();
        entry.put("rowNumber", rowNumber);
        entry.put("rawRow", row == null ? "" : String.join(";", row));
        entry.put("message", message);
        errors.add(entry);
    }

    private ParsedRow parseRow(
            List<String> row,
            BankCsvSchema schema,
            Map<BankFieldType, BankCsvColumnMapping> mappingByField,
            Set<String> positiveIndicators) {

        String bookingDateRaw = require(row, mappingByField, BankFieldType.BOOKING_DATE);
        LocalDate bookingDate = DateAmountParser.parseDate(bookingDateRaw, schema.getDateFormat());
        String valueDateRaw = optional(row, mappingByField, BankFieldType.VALUE_DATE);
        LocalDate valueDate = (valueDateRaw == null || valueDateRaw.isBlank())
                ? null
                : DateAmountParser.parseDate(valueDateRaw, schema.getDateFormat());

        BigDecimal amount = computeAmount(row, schema, mappingByField, positiveIndicators);
        String currency = optional(row, mappingByField, BankFieldType.CURRENCY);
        String purpose = optional(row, mappingByField, BankFieldType.PURPOSE);

        String counterpartyName = trimOrNull(optional(row, mappingByField, BankFieldType.COUNTERPARTY_NAME));
        String counterpartyIban = trimOrNull(optional(row, mappingByField, BankFieldType.COUNTERPARTY_IBAN));
        String counterpartyBic = trimOrNull(optional(row, mappingByField, BankFieldType.COUNTERPARTY_BIC));
        String transactionType = trimOrNull(optional(row, mappingByField, BankFieldType.TRANSACTION_TYPE));
        String bankReference = trimOrNull(optional(row, mappingByField, BankFieldType.BANK_REFERENCE));
        String endToEnd = trimOrNull(optional(row, mappingByField, BankFieldType.END_TO_END_REFERENCE));
        String mandate = trimOrNull(optional(row, mappingByField, BankFieldType.MANDATE_REFERENCE));
        String creditor = trimOrNull(optional(row, mappingByField, BankFieldType.CREDITOR_ID));
        String balanceRaw = optional(row, mappingByField, BankFieldType.BALANCE_AFTER);
        BigDecimal balance = (balanceRaw == null || balanceRaw.isBlank())
                ? null
                : DateAmountParser.parseAmount(balanceRaw, schema.getDecimalSeparator(), schema.getThousandSeparator());

        // MT940: PURPOSE column is a tagged blob — split it into purpose / EREF / MREF / CRED.
        BankCsvColumnMapping purposeMapping = mappingByField.get(BankFieldType.PURPOSE);
        if (purposeMapping != null && SystemTemplateService.TRANSFORM_MT940_BLOB.equals(purposeMapping.getTransform())
                && purpose != null) {
            Mt940PurposeParser.ParsedPurpose parsedBlob = Mt940PurposeParser.parse(purpose);
            purpose = parsedBlob.purpose();
            if (endToEnd == null) {
                endToEnd = parsedBlob.endToEndReference();
            }
            if (mandate == null) {
                mandate = parsedBlob.mandateReference();
            }
            if (creditor == null) {
                creditor = parsedBlob.creditorId();
            }
        }

        return new ParsedRow(
                bookingDate,
                valueDate,
                amount,
                currency,
                purpose,
                counterpartyName,
                counterpartyIban,
                counterpartyBic,
                transactionType,
                bankReference,
                endToEnd,
                mandate,
                creditor,
                balance,
                null);
    }

    private BigDecimal computeAmount(
            List<String> row,
            BankCsvSchema schema,
            Map<BankFieldType, BankCsvColumnMapping> mappingByField,
            Set<String> positiveIndicators) {
        AmountStrategy strategy = schema.getAmountStrategy();
        char dec = schema.getDecimalSeparator();
        Character thou = schema.getThousandSeparator();
        switch (strategy) {
            case SIGNED_SINGLE_COLUMN -> {
                String raw = require(row, mappingByField, BankFieldType.AMOUNT);
                return DateAmountParser.parseAmount(raw, dec, thou);
            }
            case DEBIT_CREDIT_COLUMNS -> {
                String debit = optional(row, mappingByField, BankFieldType.DEBIT_AMOUNT);
                String credit = optional(row, mappingByField, BankFieldType.CREDIT_AMOUNT);
                boolean hasDebit = debit != null && !debit.isBlank();
                boolean hasCredit = credit != null && !credit.isBlank();
                if (hasDebit && hasCredit) {
                    throw new IllegalArgumentException("Both DEBIT_AMOUNT and CREDIT_AMOUNT are populated");
                }
                if (!hasDebit && !hasCredit) {
                    throw new IllegalArgumentException("Neither DEBIT_AMOUNT nor CREDIT_AMOUNT is populated");
                }
                BigDecimal magnitude = DateAmountParser.parseAmount(hasDebit ? debit : credit, dec, thou).abs();
                return hasDebit ? magnitude.negate() : magnitude;
            }
            case AMOUNT_PLUS_TYPE_COLUMN -> {
                String raw = require(row, mappingByField, BankFieldType.AMOUNT);
                String indicator = require(row, mappingByField, BankFieldType.AMOUNT_TYPE_INDICATOR);
                BigDecimal magnitude = DateAmountParser.parseAmount(raw, dec, thou).abs();
                boolean positive = positiveIndicators.contains(indicator.trim().toLowerCase(Locale.ROOT));
                return positive ? magnitude : magnitude.negate();
            }
            default -> throw new IllegalStateException("Unknown amount strategy: " + strategy);
        }
    }

    private static String require(
            List<String> row,
            Map<BankFieldType, BankCsvColumnMapping> mappingByField,
            BankFieldType field) {
        String value = optional(row, mappingByField, field);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Required field " + field + " is empty");
        }
        return value;
    }

    private static String optional(
            List<String> row,
            Map<BankFieldType, BankCsvColumnMapping> mappingByField,
            BankFieldType field) {
        BankCsvColumnMapping mapping = mappingByField.get(field);
        if (mapping == null) {
            return null;
        }
        Integer index = mapping.getSourceColumnIndex();
        if (index == null || index < 0 || index >= row.size()) {
            return null;
        }
        String value = row.get(index);
        return value == null ? null : value.trim();
    }

    private static String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Internal carrier between the parse and persist passes. */
    private record ParsedRow(
            LocalDate bookingDate,
            LocalDate valueDate,
            BigDecimal amount,
            String currency,
            String purpose,
            String counterpartyName,
            String counterpartyIban,
            String counterpartyBic,
            String transactionType,
            String bankReference,
            String endToEndReference,
            String mandateReference,
            String creditorId,
            BigDecimal balanceAfter,
            String dedupeHash) {

        ParsedRow withDedupeHash(String hash) {
            return new ParsedRow(bookingDate, valueDate, amount, currency, purpose, counterpartyName,
                    counterpartyIban, counterpartyBic, transactionType, bankReference, endToEndReference,
                    mandateReference, creditorId, balanceAfter, hash);
        }
    }
}
