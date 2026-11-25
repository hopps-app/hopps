package app.hopps.bankimport.service;

import app.hopps.bankimport.api.dto.PleoImportResponse;
import app.hopps.bankimport.api.dto.PleoReceiptsResponse;
import app.hopps.bankimport.api.dto.PleoReceiptsResponse.LinkedReceipt;
import app.hopps.bankimport.api.dto.PleoReceiptsResponse.SkippedFile;
import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionMatchType;
import app.hopps.bankimport.parser.PleoCsvParser;
import app.hopps.bankimport.parser.PleoCsvParser.PleoExpense;
import app.hopps.bankimport.repository.BankImportRepository;
import app.hopps.bankimport.repository.BankTransactionRepository;
import app.hopps.bankimport.service.ReceiptFiles.ReceiptFile;
import app.hopps.category.domain.CategoryGroup;
import app.hopps.category.domain.CategoryGroupValue;
import app.hopps.category.repository.CategoryGroupRepository;
import app.hopps.category.repository.CategoryGroupValueRepository;
import app.hopps.category.service.CategoryGroupService;
import app.hopps.document.audit.DocumentAuditor;
import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentChangedEvent;
import app.hopps.document.domain.DocumentCreatedEvent;
import app.hopps.document.domain.DocumentDirection;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.document.domain.TradeParty;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.DocumentFileService;
import app.hopps.document.service.TradePartyService;
import app.hopps.shared.infrastructure.storage.StorageKeys;
import app.hopps.transaction.audit.TransactionAuditor;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionDeletedEvent;
import app.hopps.transaction.domain.TransactionStatus;
import app.hopps.transaction.repository.TransactionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Imports Pleo's expense export into a Pleo account. Each expense becomes a movement together with a draft booking that
 * is already linked to it: date, amount, merchant, the employee's note as its name, the account's bommel, and the
 * category from the export's "Category" column when a category group is chosen. Receipts are attached afterwards by
 * their file name, which Pleo sets to the expense's receipt number ("2600016.pdf"; several files "2600009a.pdf",
 * "2600009b.pdf", which are merged into one PDF). Nothing is confirmed: every booking still has to be confirmed by
 * hand.
 */
@ApplicationScoped
public class PleoImportService {

    private static final Logger LOG = LoggerFactory.getLogger(PleoImportService.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int MAX_REPORTED_ERRORS = 100;

    public static final String FILE_TYPE = "PLEO";

    /** A receipt file name: the receipt number, optionally followed by a letter or a counter for further files. */
    private static final Pattern RECEIPT_SUFFIX = Pattern.compile("^(.+?)(?:[ _-]?[a-z]|[ _-]\\d{1,2})$");

    public static final String SKIP_NO_EXPENSE = "NO_EXPENSE";
    public static final String SKIP_HAS_RECEIPT = "HAS_RECEIPT";
    public static final String SKIP_NOT_DRAFT = "NOT_DRAFT";
    public static final String SKIP_DUPLICATE = "DUPLICATE";

    @Inject
    BankAccountService bankAccountService;

    @Inject
    BankImportRepository importRepository;

    @Inject
    BankTransactionRepository bankTransactionRepository;

    @Inject
    BankTransactionMatchService matchService;

    @Inject
    ImportFileStorageService importFileStorage;

    @Inject
    CategoryGroupRepository categoryGroupRepository;

    @Inject
    CategoryGroupValueRepository categoryGroupValueRepository;

    @Inject
    CategoryGroupService categoryGroupService;

    @Inject
    TransactionRepository transactionRepository;

    @Inject
    TransactionAuditor transactionAuditor;

    @Inject
    DocumentRepository documentRepository;

    @Inject
    DocumentFileService documentFileService;

    @Inject
    DocumentAuditor documentAuditor;

    @Inject
    TradePartyService tradePartyService;

    @Inject
    Event<DocumentCreatedEvent> documentCreatedEvent;

    @Inject
    Event<DocumentChangedEvent> documentChangedEvent;

    @Inject
    Event<TransactionDeletedEvent> transactionDeletedEvent;

    @Inject
    EntityManager em;

    // ------------------------------------------------------------------------------------------------------------
    // CSV
    // ------------------------------------------------------------------------------------------------------------

    /**
     * Imports the export into the account. Expenses already imported (same Expense ID) are skipped, so an overlapping
     * export can be imported again.
     *
     * @param categoryGroupId
     *            the group the "Category" column fills; null for none. It has to apply to the account's bommel.
     *
     * @throws BadRequestException
     *             if the account is no Pleo account, the file is no Pleo export or the group does not apply
     * @throws BankImportRejectedException
     *             if the file was already imported into another account
     */
    @Transactional
    public PleoImportResponse importExport(Long accountId, String fileName, byte[] content, Long categoryGroupId,
            String username) {
        BankAccount account = requirePleoAccount(accountId);
        CategoryGroup group = resolveCategoryGroup(account, categoryGroupId);

        PleoCsvParser.Result parsed;
        try {
            parsed = PleoCsvParser.parse(content);
        } catch (PleoCsvParser.NotAPleoExportException e) {
            throw new BadRequestException("Not a Pleo export: missing columns " + e.getMissingColumns());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }

        String sha256 = DedupeHashService.sha256(content);
        BankImport sameFile = importRepository.findOnOtherAccount(accountId, sha256);
        if (sameFile != null) {
            throw BankImportRejectedException.alreadyImported(sameFile.getBankAccount());
        }

        String displayName = StorageKeys.displayName(fileName, ImportFileStorageService.DEFAULT_FILE_NAME);
        BankImport job = new BankImport();
        job.setOrganization(account.getOrganization());
        job.setBankAccount(account);
        job.setFileType(FILE_TYPE);
        job.setFileName(displayName);
        job.setFileSize(content.length);
        job.setFileSha256(sha256);
        job.setS3FileKey(importFileStorage.storeImportFile(account.getOrganization().getId(), fileName, content,
                "text/csv"));
        job.setImportedBy(username);
        job.setStatus(BankImportStatus.PROCESSING);
        job.setStartedAt(Instant.now());
        job.persist();

        account.setCategoryGroup(group);
        Map<String, String> categories = group == null ? Map.of() : selectableValues(group);

        ArrayNode errors = JSON.createArrayNode();
        parsed.errors().forEach(e -> appendError(errors, e.rowNumber(), e.message()));
        int errorRows = parsed.errors().size();

        Map<PleoExpense, String> hashes = new LinkedHashMap<>();
        for (PleoExpense expense : parsed.expenses()) {
            hashes.put(expense, dedupeHash(expense));
        }
        Set<String> existing = bankTransactionRepository.findExistingDedupeHashes(account.getId(),
                new HashSet<>(hashes.values()));
        Set<String> seen = new HashSet<>();

        int imported = 0;
        int duplicates = 0;
        int categorized = 0;
        int withoutCategory = 0;
        int awaitingReceipt = 0;
        Set<String> unknownCategories = new LinkedHashSet<>();

        for (Map.Entry<PleoExpense, String> entry : hashes.entrySet()) {
            PleoExpense expense = entry.getKey();
            String hash = entry.getValue();
            if (existing.contains(hash) || !seen.add(hash)) {
                duplicates++;
                continue;
            }
            if (expense.currency() != null && !expense.currency().equals(account.getCurrency())) {
                errorRows++;
                appendError(errors, expense.rowNumber(), "Currency " + expense.currency()
                        + " differs from the account's currency " + account.getCurrency());
                continue;
            }

            BankTransaction bankTx = createMovement(account, job, expense, hash);
            Transaction transaction = createDraft(account, expense, username);

            String category = expense.category() == null ? null : categories.get(norm(expense.category()));
            if (group != null && category != null) {
                transaction.replaceCategoryValues(Map.of(group.getId(), category));
                categorized++;
            } else if (expense.category() == null) {
                withoutCategory++;
            } else if (group != null) {
                unknownCategories.add(expense.category());
            }

            transactionRepository.persist(transaction);
            transactionAuditor.created(transaction);
            matchService.addAutoMatch(bankTx.getId(), transaction.getId(), username);
            imported++;
            if (expense.receiptNumber() != null) {
                awaitingReceipt++;
            }
        }

        job.setTotalRows(parsed.expenses().size() + parsed.errors().size());
        job.setImportedRows(imported);
        job.setDuplicateRows(duplicates);
        job.setErrorRows(errorRows);
        job.setProgress(100);
        job.setFinishedAt(Instant.now());
        if (!errors.isEmpty()) {
            ObjectNode report = JSON.createObjectNode();
            report.set("errors", errors);
            job.setErrorReport(report.toString());
        }
        job.setStatus(errorRows > 0 ? BankImportStatus.PARTIAL : BankImportStatus.COMPLETED);
        LOG.info("Pleo import {} into account {}: imported={}, duplicate={}, error={}, categorized={}",
                job.getId(), accountId, imported, duplicates, errorRows, categorized);

        List<String> errorMessages = new ArrayList<>();
        errors.forEach(e -> errorMessages.add(e.get("rowNumber").asInt() + ": " + e.get("message").asText()));
        return new PleoImportResponse(job.getId(), job.getTotalRows(), imported, duplicates, errorRows,
                categorized, withoutCategory, List.copyOf(unknownCategories), awaitingReceipt, errorMessages);
    }

    private BankTransaction createMovement(BankAccount account, BankImport job, PleoExpense expense, String hash) {
        BankTransaction bankTx = new BankTransaction();
        bankTx.setOrganization(account.getOrganization());
        bankTx.setBankAccount(account);
        bankTx.setBankImport(job);
        bankTx.setBookingDate(expense.date());
        bankTx.setAmount(expense.amount());
        bankTx.setCurrency(account.getCurrency());
        bankTx.setPurpose(expense.note() != null ? expense.note() : expense.merchant());
        bankTx.setCounterpartyName(truncate(expense.merchant(), 512));
        bankTx.setTransactionType(truncate(expense.expenseType(), 255));
        bankTx.setBankReference(truncate(expense.receiptNumber(), 255));
        bankTx.setEndToEndReference(truncate(expense.expenseId(), 255));
        bankTx.setRawRow(expense.rawRow());
        bankTx.setDedupeHash(hash);
        bankTx.persist();
        return bankTx;
    }

    private Transaction createDraft(BankAccount account, PleoExpense expense, String username) {
        Transaction transaction = new Transaction();
        transaction.setOrganization(account.getOrganization());
        transaction.setBommel(account.getBommel());
        transaction.setCreatedBy(username);
        transaction.setStatus(TransactionStatus.DRAFT);
        // The employee's note says what the expense was for; the merchant is the fallback.
        transaction.setName(expense.note() != null ? expense.note() : expense.merchant());
        transaction.setTotal(expense.amount());
        transaction.setCurrencyCode(account.getCurrency());
        transaction.setTransactionTime(expense.date().atStartOfDay(ZoneOffset.UTC).toInstant());
        transaction.setCounterparty(counterparty(account, expense.merchant()));
        return transaction;
    }

    private static TradeParty counterparty(BankAccount account, String merchant) {
        if (merchant == null) {
            return null;
        }
        TradeParty party = new TradeParty();
        party.setOrganization(account.getOrganization());
        party.setName(merchant);
        return party;
    }

    /** The Expense ID is Pleo's own stable key; without it the row's content stands in. */
    private static String dedupeHash(PleoExpense expense) {
        String key = expense.expenseId() != null
                ? "pleo|" + expense.expenseId()
                : "pleo|" + expense.date() + "|" + expense.amount().toPlainString() + "|"
                        + Objects.toString(expense.merchant(), "") + "|"
                        + Objects.toString(expense.receiptNumber(), "") + "|"
                        + Objects.toString(expense.note(), "");
        return DedupeHashService.sha256(key.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private CategoryGroup resolveCategoryGroup(BankAccount account, Long categoryGroupId) {
        if (categoryGroupId == null) {
            return null;
        }
        CategoryGroup group = categoryGroupRepository.findByIdScoped(categoryGroupId);
        if (group == null) {
            throw new BadRequestException("Category group not found");
        }
        boolean applies = categoryGroupService.applicableGroups(account.getBommel())
                .stream()
                .anyMatch(g -> g.getId().equals(group.getId()));
        if (!applies) {
            throw new BadRequestException("The category group does not apply to the account's bommel");
        }
        return group;
    }

    /** Bookable values of the group by their name, compared without case and surrounding spaces. */
    private Map<String, String> selectableValues(CategoryGroup group) {
        Map<String, String> values = new HashMap<>();
        for (CategoryGroupValue value : categoryGroupValueRepository.allInTreeOrder(group.getId())) {
            if (value.isSelectable()) {
                values.putIfAbsent(norm(value.getValue()), value.getValue());
            }
        }
        return values;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Receipts
    // ------------------------------------------------------------------------------------------------------------

    /**
     * Attaches receipt files (single files or ZIP archives) to the imported expenses by their receipt number. Several
     * files of one expense are merged into one PDF, in the order of their names. An expense whose booking has a receipt
     * already, or is confirmed, is left alone.
     */
    @Transactional
    public PleoReceiptsResponse attachReceipts(Long accountId, List<ReceiptFiles.Upload> uploads, String username) {
        BankAccount account = requirePleoAccount(accountId);
        ReceiptFiles.Collected collected = ReceiptFiles.collect(uploads);

        List<SkippedFile> skipped = new ArrayList<>();
        collected.rejected().forEach(r -> skipped.add(new SkippedFile(r.name(), r.reason())));

        // Expenses of the account by receipt number, for every candidate number the file names could mean.
        Map<String, Set<String>> candidatesByFile = new HashMap<>();
        Set<String> allCandidates = new HashSet<>();
        for (ReceiptFile file : collected.files()) {
            Set<String> candidates = receiptNumberCandidates(file.name());
            candidatesByFile.put(file.name(), candidates);
            allCandidates.addAll(candidates);
        }
        Map<String, BankTransaction> expensesByNumber = expensesByReceiptNumber(account, allCandidates);

        // Group the files by the expense they belong to; the exact number wins over a stripped suffix.
        Map<BankTransaction, List<ReceiptFile>> filesByExpense = new LinkedHashMap<>();
        for (ReceiptFile file : collected.files()) {
            BankTransaction expense = null;
            for (String candidate : candidatesByFile.get(file.name())) {
                expense = expensesByNumber.get(candidate);
                if (expense != null) {
                    break;
                }
            }
            if (expense == null) {
                skipped.add(new SkippedFile(file.name(), SKIP_NO_EXPENSE));
            } else {
                filesByExpense.computeIfAbsent(expense, k -> new ArrayList<>()).add(file);
            }
        }

        List<LinkedReceipt> linked = new ArrayList<>();
        for (Map.Entry<BankTransaction, List<ReceiptFile>> entry : filesByExpense.entrySet()) {
            BankTransaction expense = entry.getKey();
            List<ReceiptFile> files = new ArrayList<>(entry.getValue());
            files.sort(Comparator.comparing(f -> f.name().toLowerCase(Locale.ROOT)));
            List<String> names = files.stream().map(ReceiptFile::name).toList();

            Transaction draft = expenseDraft(expense);
            if (draft == null || draft.getStatus() != TransactionStatus.DRAFT) {
                names.forEach(n -> skipped.add(new SkippedFile(n, SKIP_NOT_DRAFT)));
                continue;
            }
            if (draft.getDocument() != null) {
                names.forEach(n -> skipped.add(new SkippedFile(n, SKIP_HAS_RECEIPT)));
                continue;
            }

            ReceiptFile receipt = files.size() == 1 ? files.get(0) : merge(expense, files, skipped);
            if (receipt == null) {
                continue;
            }
            Document document = attach(account, expense, draft, receipt, username, skipped, names);
            if (document != null) {
                linked.add(new LinkedReceipt(expense.getBankReference(), names, draft.getId(), document.getId()));
            }
        }

        LOG.info("Pleo receipts for account {}: files={}, linked={}, skipped={}", accountId,
                collected.files().size() + collected.rejected().size(), linked.size(), skipped.size());
        return new PleoReceiptsResponse(linked, skipped);
    }

    private ReceiptFile merge(BankTransaction expense, List<ReceiptFile> files, List<SkippedFile> skipped) {
        try {
            String name = Objects.requireNonNullElse(expense.getBankReference(), "beleg") + ".pdf";
            return new ReceiptFile(name, ReceiptFiles.PDF, ReceiptFiles.mergeToPdf(files));
        } catch (IOException | RuntimeException e) {
            LOG.warn("Could not merge receipts of expense {}", expense.getId(), e);
            files.forEach(f -> skipped.add(new SkippedFile(f.name(), ReceiptFiles.REASON_UNREADABLE)));
            return null;
        }
    }

    /**
     * Stores the file as a new receipt of the booking and starts its analysis. Returns null (and records why) if the
     * organization has the very same file already.
     */
    private Document attach(BankAccount account, BankTransaction expense, Transaction transaction,
            ReceiptFile file, String username, List<SkippedFile> skipped, List<String> names) {
        String hash = DedupeHashService.sha256(file.content());
        if (documentRepository.findByFileHash(hash, account.getOrganization().getId()) != null) {
            names.forEach(n -> skipped.add(new SkippedFile(n, SKIP_DUPLICATE)));
            return null;
        }
        Document document = new Document();
        document.setOrganization(account.getOrganization());
        document.setBommel(account.getBommel());
        document.setAnalysisStatus(AnalysisStatus.PENDING);
        document.setUploadedBy(username);
        // Money out is an incoming invoice; a refund (money in) an outgoing one.
        document.setDirection(expense.getAmount().signum() < 0 ? DocumentDirection.INCOMING
                : DocumentDirection.OUTGOING);
        documentFileService.handleFileUpload(document, file.name(), file.contentType(), file.content());
        document.setDocumentStatus(DocumentStatus.UPLOADED);
        documentRepository.persist(document);

        Map<String, Object> before = transactionAuditor.snapshot(transaction);
        transaction.setDocument(document);
        document.getTransactions().add(transaction);
        transactionAuditor.updated(transaction, before);
        documentAuditor.created(document);

        documentCreatedEvent.fire(new DocumentCreatedEvent(document.getId()));
        documentChangedEvent.fire(new DocumentChangedEvent(document.getId(), account.getOrganization().getId()));
        return document;
    }

    /**
     * The numbers a receipt file name may stand for: the name itself ("2600016"), and without a trailing letter or
     * counter ("2600009a" → "2600009", "2600009_2" → "2600009"). The exact name comes first.
     */
    static Set<String> receiptNumberCandidates(String fileName) {
        String stem = ReceiptFiles.stem(fileName);
        Set<String> candidates = new LinkedHashSet<>();
        candidates.add(stem);
        Matcher matcher = RECEIPT_SUFFIX.matcher(stem);
        if (matcher.matches()) {
            candidates.add(matcher.group(1));
        }
        return candidates;
    }

    /** The account's expenses by (lower-cased) receipt number; the newest one wins if a number repeats. */
    private Map<String, BankTransaction> expensesByReceiptNumber(BankAccount account, Set<String> numbers) {
        if (numbers.isEmpty()) {
            return Map.of();
        }
        List<BankTransaction> expenses = em.createQuery(
                "SELECT t FROM BankTransaction t WHERE t.bankAccount.id = :accountId "
                        + "AND lower(t.bankReference) IN :numbers ORDER BY t.id",
                BankTransaction.class)
                .setParameter("accountId", account.getId())
                .setParameter("numbers", numbers)
                .getResultList();
        Map<String, BankTransaction> byNumber = new HashMap<>();
        for (BankTransaction expense : expenses) {
            byNumber.put(expense.getBankReference().toLowerCase(Locale.ROOT), expense);
        }
        return byNumber;
    }

    /** The draft the import created for the expense: its first automatic link. */
    private Transaction expenseDraft(BankTransaction expense) {
        List<Transaction> drafts = em.createQuery(
                "SELECT m.transaction FROM BankTransactionMatch m WHERE m.bankTransaction.id = :id "
                        + "AND m.matchType = :type ORDER BY m.transaction.id",
                Transaction.class)
                .setParameter("id", expense.getId())
                .setParameter("type", BankTransactionMatchType.AUTO_RULE)
                .setMaxResults(1)
                .getResultList();
        return drafts.isEmpty() ? null : drafts.get(0);
    }

    // ------------------------------------------------------------------------------------------------------------
    // Rollback
    // ------------------------------------------------------------------------------------------------------------

    /**
     * Before a Pleo import is taken back: removes the drafts it created, with their receipts, as long as nobody has
     * confirmed them. Anything confirmed stays linked, so the import then remains in use and cannot be taken back.
     * Clears the persistence context afterwards: reload what you still need.
     */
    public void releaseDrafts(BankImport job) {
        List<Transaction> drafts = em.createQuery(
                "SELECT DISTINCT m.transaction FROM BankTransactionMatch m WHERE m.bankTransaction.bankImport.id = :id "
                        + "AND m.matchType = :type AND m.transaction.status = :draft",
                Transaction.class)
                .setParameter("id", job.getId())
                .setParameter("type", BankTransactionMatchType.AUTO_RULE)
                .setParameter("draft", TransactionStatus.DRAFT)
                .getResultList();
        for (Transaction draft : drafts) {
            Document document = draft.getDocument();
            transactionDeletedEvent.fire(new TransactionDeletedEvent(draft.getId()));
            TradeParty sender = draft.getSender();
            TradeParty recipient = draft.getRecipient();
            if (document != null) {
                document.getTransactions().remove(draft);
            }
            transactionRepository.delete(draft);
            tradePartyService.deleteIfUnreferenced(sender);
            tradePartyService.deleteIfUnreferenced(recipient);
            if (document != null && document.getTransactions().isEmpty()
                    && document.getDocumentStatus() != DocumentStatus.CONFIRMED) {
                documentAuditor.deleted(document);
                if (document.hasFile()) {
                    documentFileService.deleteFile(document.getFileKey());
                }
                documentChangedEvent.fire(new DocumentChangedEvent(document.getId(),
                        job.getOrganization().getId()));
                documentRepository.delete(document);
            }
        }
        // The bulk delete of the movements follows; nothing loaded here may still point at them.
        em.flush();
        em.clear();
        LOG.info("Pleo import {}: released {} drafts before rollback", job.getId(), drafts.size());
    }

    // ------------------------------------------------------------------------------------------------------------

    private BankAccount requirePleoAccount(Long accountId) {
        BankAccount account = bankAccountService.get(accountId);
        if (!account.isPleo()) {
            throw new BadRequestException("Not a Pleo account");
        }
        if (account.isArchived()) {
            throw new BadRequestException("Cannot import into an archived account");
        }
        return account;
    }

    private static void appendError(ArrayNode errors, int rowNumber, String message) {
        if (errors.size() >= MAX_REPORTED_ERRORS) {
            return;
        }
        ObjectNode entry = JSON.createObjectNode();
        entry.put("rowNumber", rowNumber);
        entry.put("message", message);
        errors.add(entry);
    }

    private static String norm(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }
}
