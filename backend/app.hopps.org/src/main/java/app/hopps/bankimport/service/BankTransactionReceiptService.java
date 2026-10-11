package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionStatus;
import app.hopps.bankimport.repository.BankTransactionRepository;
import app.hopps.document.api.dto.DocumentResponse;
import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentChangedEvent;
import app.hopps.document.domain.DocumentCreatedEvent;
import app.hopps.document.domain.DocumentDirection;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.document.domain.TradeParty;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.DocumentFileService;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import app.hopps.transaction.domain.Transaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Uploads a receipt (Document) onto an existing {@link BankTransaction}.
 * <p>
 * The upload only stores the document and remembers the bank transaction on it. Like a receipt uploaded on the receipts
 * page, the bookkeeping {@link Transaction} is created when the receipt is confirmed; at that point it is matched to
 * the remembered bank transaction, and fields the receipt leaves empty are taken from the bank movement (see
 * {@link #fillFromPendingBankTransaction} and {@link #matchPendingBankTransaction}).
 */
@ApplicationScoped
public class BankTransactionReceiptService {

    private static final Logger LOG = LoggerFactory.getLogger(BankTransactionReceiptService.class);
    private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            "image/png", "image/jpeg", "application/pdf");

    @Inject
    BankTransactionRepository bankTransactionRepository;

    @Inject
    DocumentRepository documentRepository;

    @Inject
    DocumentFileService fileService;

    @Inject
    BankTransactionMatchService matchService;

    @Inject
    Event<DocumentCreatedEvent> documentCreatedEvent;

    @Inject
    Event<DocumentChangedEvent> documentChangedEvent;

    @Inject
    OrganizationContext organizationContext;

    @Transactional
    public DocumentResponse createReceiptForBankTransaction(Long bankTxId, FileUpload file, boolean analyze,
            String username) {
        if (file == null || file.fileName() == null || file.fileName().isBlank()) {
            throw new BadRequestException("File is required");
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.contentType())) {
            throw new ClientErrorException(
                    "Unsupported file type: " + file.contentType() + ". Allowed: " + ALLOWED_CONTENT_TYPES,
                    Response.Status.UNSUPPORTED_MEDIA_TYPE);
        }

        BankTransaction bankTx = bankTransactionRepository.findByIdScoped(bankTxId);
        if (bankTx == null) {
            throw new NotFoundException("Bank transaction not found");
        }
        if (bankTx.getStatus() == BankTransactionStatus.IGNORED) {
            throw new BadRequestException("Cannot attach a receipt to an ignored bank transaction");
        }

        Organization organization = organizationContext.getCurrentOrganization();
        if (organization == null) {
            throw new BadRequestException("User is not part of an organization");
        }

        BigDecimal amount = bankTx.getAmount();
        // Negative bank amount = money out = expense = Eingangsbeleg (INCOMING); positive = income = Ausgangsbeleg.
        DocumentDirection direction = amount != null && amount.signum() < 0
                ? DocumentDirection.INCOMING
                : DocumentDirection.OUTGOING;

        // The document fields stay empty so the AI autofills them independently of the bank-derived values.
        Document document = new Document();
        document.setOrganization(organization);
        document.setAnalysisStatus(AnalysisStatus.PENDING);
        document.setUploadedBy(username);
        document.setDirection(direction);
        document.setPendingBankTransactionId(bankTxId);
        fileService.handleFileUpload(document, file);
        document.setDocumentStatus(DocumentStatus.UPLOADED);
        documentRepository.persist(document);

        // Kick off (or skip) the async AI analysis of the document.
        if (analyze) {
            documentCreatedEvent.fire(new DocumentCreatedEvent(document.getId()));
        } else {
            document.setAnalysisStatus(AnalysisStatus.SKIPPED);
        }

        // Notify list views (after commit) that a new receipt exists.
        documentChangedEvent.fire(new DocumentChangedEvent(document.getId(), organization.getId()));

        LOG.info("Uploaded receipt for bank transaction: bankTxId={}, documentId={}", bankTxId, document.getId());
        return DocumentResponse.from(document);
    }

    /**
     * Fills the fields the confirmed receipt left empty on the transaction being created from it, using the bank
     * transaction the receipt was uploaded onto. Call before the transaction is persisted. Does nothing when the
     * receipt has no pending bank transaction, or that bank transaction was deleted or ignored in the meantime.
     */
    public void fillFromPendingBankTransaction(Document document, Transaction transaction) {
        BankTransaction bankTx = pendingBankTransaction(document.getPendingBankTransactionId());
        if (bankTx == null) {
            return;
        }
        if (transaction.getName() == null || transaction.getName().isBlank()) {
            transaction.setName(bankTx.getPurpose());
        }
        if (transaction.getTotal() == null) {
            transaction.setTotal(bankTx.getAmount());
        }
        if (document.getCurrencyCode() == null && bankTx.getCurrency() != null) {
            transaction.setCurrencyCode(bankTx.getCurrency());
        }
        if (transaction.getTransactionTime() == null && bankTx.getBookingDate() != null) {
            transaction.setTransactionTime(bankTx.getBookingDate().atStartOfDay(ZoneOffset.UTC).toInstant());
        }
        // Vertragspartner = counterparty of the bank movement. Set after the total, because the entity places it on
        // the side matching the direction and records the organization on the other side.
        if (transaction.getCounterparty() == null && bankTx.getCounterpartyName() != null
                && !bankTx.getCounterpartyName().isBlank()) {
            TradeParty counterparty = new TradeParty();
            counterparty.setOrganization(document.getOrganization());
            counterparty.setName(bankTx.getCounterpartyName());
            if (bankTx.getCounterpartyIban() != null && !bankTx.getCounterpartyIban().isBlank()) {
                counterparty.setVatId(bankTx.getCounterpartyIban());
            }
            transaction.setCounterparty(counterparty);
        }
    }

    /**
     * Matches the transaction just created from a confirmed receipt to the bank transaction the receipt was uploaded
     * onto, then clears the pending link. Call after the transaction is persisted. A bank transaction that was deleted
     * or ignored in the meantime is skipped, so it never blocks confirming the receipt.
     */
    public void matchPendingBankTransaction(Document document, Transaction transaction, String username) {
        Long bankTxId = document.getPendingBankTransactionId();
        if (bankTxId == null) {
            return;
        }
        document.setPendingBankTransactionId(null);
        BankTransaction bankTx = pendingBankTransaction(bankTxId);
        if (bankTx == null) {
            LOG.info("Pending bank transaction of receipt is gone or ignored, not matching: documentId={}, bankTxId={}",
                    document.getId(), bankTxId);
            return;
        }
        matchService.addMatch(bankTxId, transaction.getId(), username, allocationForOpenRest(bankTx, transaction));
        LOG.info("Matched confirmed receipt to its bank transaction: documentId={}, transactionId={}, bankTxId={}",
                document.getId(), transaction.getId(), bankTxId);
    }

    /**
     * Lists the receipts uploaded onto a bank transaction that are not confirmed yet.
     */
    public List<DocumentResponse> listPendingReceipts(Long bankTxId) {
        if (bankTransactionRepository.findByIdScoped(bankTxId) == null) {
            throw new NotFoundException("Bank transaction not found");
        }
        return documentRepository.findPendingForBankTransaction(bankTxId).stream().map(DocumentResponse::from).toList();
    }

    /**
     * Detaches a not yet confirmed receipt from the bank transaction it was uploaded onto. The receipt itself stays and
     * can be confirmed like any other; it is just no longer matched to this bank transaction on confirm.
     */
    @Transactional
    public void detachPendingReceipt(Long bankTxId, Long documentId) {
        Document document = documentRepository.findByIdScoped(documentId);
        if (document == null || !bankTxId.equals(document.getPendingBankTransactionId())) {
            throw new NotFoundException("No pending receipt with this id on the bank transaction");
        }
        document.setPendingBankTransactionId(null);
        documentChangedEvent.fire(new DocumentChangedEvent(document.getId(), document.getOrganization().getId()));
    }

    /**
     * The allocation for a confirmed receipt's transaction: as much as it needs, but no more than what is still open on
     * the bank transaction, so a second receipt on the same movement only takes the rest. Returns null (the default,
     * full allocation) when that is not smaller than the default anyway, or nothing is open any more.
     */
    private BigDecimal allocationForOpenRest(BankTransaction bankTx, Transaction transaction) {
        if (bankTx.getAmount() == null || transaction.getTotal() == null) {
            return null;
        }
        BigDecimal magnitude = bankTx.getAmount().abs();
        BigDecimal allocated = matchService.getAllocationsByTransactionForBankTransaction(bankTx.id)
                .values()
                .stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal open = magnitude.subtract(allocated);
        BigDecimal defaultAllocation = transaction.getTotal().abs().min(magnitude);
        return open.signum() > 0 && open.compareTo(defaultAllocation) < 0 ? open : null;
    }

    private BankTransaction pendingBankTransaction(Long bankTxId) {
        if (bankTxId == null) {
            return null;
        }
        BankTransaction bankTx = bankTransactionRepository.findByIdScoped(bankTxId);
        return bankTx != null && bankTx.getStatus() != BankTransactionStatus.IGNORED ? bankTx : null;
    }
}
