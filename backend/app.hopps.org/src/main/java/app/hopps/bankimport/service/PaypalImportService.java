package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionStatus;
import app.hopps.bankimport.parser.EncodingDetector;
import app.hopps.bankimport.parser.PaypalCsvParser;
import app.hopps.bankimport.parser.PaypalCsvParser.Entry;
import app.hopps.bankimport.parser.PaypalCsvParser.Kind;
import app.hopps.bankimport.parser.PaypalCsvParser.Problem;
import app.hopps.bankimport.repository.BankTransactionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Runs the import of a PayPal activity export into a PayPal account. How the rows become movements is described in
 * {@link PaypalCsvParser}; this service dedupes and persists them. Top-ups and withdrawals are stored with status
 * {@link BankTransactionStatus#TRANSFER}.
 */
@ApplicationScoped
public class PaypalImportService {

    public static final String FILE_TYPE = "PAYPAL";

    private static final Logger LOG = LoggerFactory.getLogger(PaypalImportService.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int MAX_REPORTED_ERRORS = 500;
    private static final int MAX_ROWS = 5000;

    @Inject
    BankTransactionRepository transactionRepository;

    @Inject
    DedupeHashService dedupeHashService;

    @Inject
    ImportFileStorageService fileStorage;

    @Inject
    BankImportService bankImportService;

    @Transactional
    public void runImport(Long importId) {
        BankImport job = BankImport.findById(importId);
        if (job == null) {
            LOG.warn("BankImport {} not found, skipping", importId);
            return;
        }
        BankAccount account = job.getBankAccount();

        ArrayNode errors = JSON.createArrayNode();
        int importedRows = 0;
        int duplicateRows = 0;

        try {
            byte[] bytes = fileStorage.readImportFile(job.getS3FileKey());
            PaypalCsvParser.Result result = PaypalCsvParser.parse(decode(bytes), account.getCurrency());
            List<Entry> entries = result.entries();
            int errorRows = result.problems().size();
            int totalRows = entries.size() + errorRows;
            if (totalRows > MAX_ROWS) {
                fail(job, "Datei enthält " + totalRows + " Buchungen, Maximum sind " + MAX_ROWS);
                return;
            }
            for (Problem problem : result.problems()) {
                appendError(errors, problem);
            }
            int checkpointInterval = Math.max(1, totalRows / 20);

            String[] hashes = new String[entries.size()];
            Set<String> dedupeHashes = new HashSet<>();
            for (int i = 0; i < entries.size(); i++) {
                Entry entry = entries.get(i);
                // The PayPal transaction code is unique and stable across exports, so it alone identifies a movement.
                hashes[i] = dedupeHashService.computeHash(entry.bookingDate(), entry.amount(), null,
                        "paypal:" + entry.key(), entry.purpose());
                dedupeHashes.add(hashes[i]);
            }
            Set<String> existing = transactionRepository.findExistingDedupeHashes(account.getId(), dedupeHashes);

            Set<String> seenInThisImport = new HashSet<>();
            for (int i = 0; i < entries.size(); i++) {
                Entry entry = entries.get(i);
                String hash = hashes[i];
                if (existing.contains(hash) || !seenInThisImport.add(hash)) {
                    duplicateRows++;
                    continue;
                }

                BankTransaction tx = new BankTransaction();
                tx.setOrganization(account.getOrganization());
                tx.setBankAccount(account);
                tx.setBankImport(job);
                tx.setBookingDate(entry.bookingDate());
                tx.setAmount(entry.amount());
                tx.setCurrency(entry.currency());
                tx.setPurpose(entry.purpose());
                tx.setCounterpartyName(entry.counterpartyName());
                tx.setTransactionType(entry.transactionType());
                tx.setBankReference(entry.transactionCode());
                tx.setBalanceAfter(entry.balanceAfter());
                tx.setRawRow(entry.rawRow());
                tx.setDedupeHash(hash);
                if (entry.kind() == Kind.TRANSFER) {
                    tx.setStatus(BankTransactionStatus.TRANSFER);
                }
                tx.persist();
                importedRows++;

                if ((importedRows + duplicateRows) % checkpointInterval == 0) {
                    bankImportService.reportProgress(importId, percent(importedRows + duplicateRows, totalRows),
                            importedRows, duplicateRows, errorRows);
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
            LOG.info("PayPal import {} done: total={}, imported={}, duplicate={}, error={}",
                    importId, totalRows, importedRows, duplicateRows, errorRows);

        } catch (RuntimeException fatal) {
            LOG.error("PayPal import {} failed", importId, fatal);
            fail(job, fatal.getMessage());
        }
    }

    /** PayPal exports UTF-8 (with a byte order mark, which the parser drops). */
    static String decode(byte[] bytes) {
        return EncodingDetector.decodeStrict(bytes, StandardCharsets.UTF_8);
    }

    private void fail(BankImport job, String reason) {
        job.setStatus(BankImportStatus.FAILED);
        job.setFailureReason(reason);
        job.setFinishedAt(Instant.now());
    }

    private static int percent(int done, int total) {
        return total == 0 ? 100 : Math.min(99, (int) ((done * 100L) / total));
    }

    private static void appendError(ArrayNode errors, Problem problem) {
        if (errors.size() >= MAX_REPORTED_ERRORS) {
            return;
        }
        ObjectNode entry = JSON.createObjectNode();
        entry.put("rowNumber", problem.rowNumber());
        entry.put("rawRow", problem.rawRow());
        entry.put("message", problem.message());
        errors.add(entry);
    }
}
