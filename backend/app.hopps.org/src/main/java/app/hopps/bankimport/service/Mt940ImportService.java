package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.parser.EncodingDetector;
import app.hopps.bankimport.parser.Mt940Parser;
import app.hopps.bankimport.parser.Mt940Parser.ParsedMt940Transaction;
import app.hopps.bankimport.repository.BankTransactionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.Charset;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Orchestrates a single MT940 import job: load file → decode → parse → persist {@link BankTransaction}s. Mirrors
 * {@link CsvImportService} but uses {@link Mt940Parser} instead of the CSV pipeline and requires no schema.
 */
@ApplicationScoped
public class Mt940ImportService {

    private static final Logger LOG = LoggerFactory.getLogger(Mt940ImportService.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int MAX_REPORTED_ERRORS = 500;
    private static final int MAX_ROWS = 5000;

    @Inject
    BankTransactionRepository transactionRepository;

    @Inject
    DedupeHashService dedupeHashService;

    @Inject
    ImportFileStorageService fileStorage;

    /**
     * Runs the full MT940 import pipeline for a {@link BankImport} that the worker just claimed (status=PROCESSING).
     */
    @Transactional
    public void runImport(Long importId) {
        BankImport job = BankImport.findById(importId);
        if (job == null) {
            LOG.warn("BankImport {} not found, skipping", importId);
            return;
        }
        BankAccount account = job.getBankAccount();

        ArrayNode errors = JSON.createArrayNode();
        int totalRows = 0;
        int importedRows = 0;
        int duplicateRows = 0;
        int errorRows = 0;

        try {
            byte[] bytes = fileStorage.readImportFile(job.getS3FileKey());
            String text = decodeWithFallback(bytes);

            List<ParsedMt940Transaction> transactions = Mt940Parser.parse(text);
            totalRows = transactions.size();
            if (totalRows > MAX_ROWS) {
                fail(job, "Datei enthält " + totalRows + " Transaktionen — Maximum sind " + MAX_ROWS);
                return;
            }

            Set<String> dedupeHashes = new HashSet<>();

            // First pass: compute dedupe hashes
            String[] hashes = new String[totalRows];
            for (int i = 0; i < totalRows; i++) {
                ParsedMt940Transaction tx = transactions.get(i);
                try {
                    hashes[i] = dedupeHashService.computeHash(
                            tx.bookingDate(),
                            tx.amount(),
                            tx.counterpartyIban(),
                            tx.endToEndReference(),
                            tx.purpose());
                    dedupeHashes.add(hashes[i]);
                } catch (Exception e) {
                    hashes[i] = null;
                    errorRows++;
                    appendError(errors, i + 1, tx, e.getMessage());
                }
            }

            Set<String> existing = transactionRepository.findExistingDedupeHashes(account.getId(), dedupeHashes);

            // Second pass: persist
            Set<String> seenInThisImport = new HashSet<>();
            for (int i = 0; i < transactions.size(); i++) {
                ParsedMt940Transaction pr = transactions.get(i);
                String hash = hashes[i];
                if (hash == null) {
                    continue;
                }
                if (existing.contains(hash) || !seenInThisImport.add(hash)) {
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
                tx.setEndToEndReference(pr.endToEndReference());
                tx.setMandateReference(pr.mandateReference());
                tx.setCreditorId(pr.creditorId());
                tx.setBalanceAfter(pr.balanceAfter());
                tx.setRawRow(pr.rawLine());
                tx.setDedupeHash(hash);
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
            LOG.info("MT940 Import {} done: total={}, imported={}, duplicate={}, error={}",
                    importId, totalRows, importedRows, duplicateRows, errorRows);

        } catch (RuntimeException fatal) {
            LOG.error("MT940 Import {} failed", importId, fatal);
            fail(job, fatal.getMessage());
        }
    }

    private void fail(BankImport job, String reason) {
        job.setStatus(BankImportStatus.FAILED);
        job.setFailureReason(reason);
        job.setFinishedAt(Instant.now());
    }

    private static String decodeWithFallback(byte[] bytes) {
        try {
            Charset charset = EncodingDetector.detect(bytes);
            return EncodingDetector.decodeStrict(bytes, charset);
        } catch (IllegalArgumentException e) {
            try {
                return EncodingDetector.decodeStrict(bytes, EncodingDetector.FALLBACK_CHARSET);
            } catch (IllegalArgumentException e2) {
                return new String(bytes, EncodingDetector.FALLBACK_CHARSET);
            }
        }
    }

    private static int percent(int done, int total) {
        return total == 0 ? 100 : Math.min(99, (int) ((done * 100L) / total));
    }

    private void appendError(ArrayNode errors, int rowNumber, ParsedMt940Transaction tx, String message) {
        if (errors.size() >= MAX_REPORTED_ERRORS) {
            return;
        }
        ObjectNode entry = JSON.createObjectNode();
        entry.put("rowNumber", rowNumber);
        entry.put("rawRow", tx.rawLine() != null ? tx.rawLine() : "");
        entry.put("message", message);
        errors.add(entry);
    }
}
