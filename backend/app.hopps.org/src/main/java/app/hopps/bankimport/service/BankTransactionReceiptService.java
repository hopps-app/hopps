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
import app.hopps.transaction.domain.TransactionStatus;
import app.hopps.transaction.repository.TransactionRepository;
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
 * Creates a receipt (Document) together with a pre-filled bookkeeping {@link Transaction} for an existing
 * {@link BankTransaction}, and links all three (Document &harr; Transaction, BankTransaction &harr; Transaction).
 * <p>
 * The transaction is seeded from the bank movement (counterparty &rarr; trade party, amount, purpose &rarr; name) so it
 * can be reconciled immediately. The document is still analysed by the Document-AI; the user later decides per field
 * whether to keep the bank-derived value or the AI-extracted one (see the receipt review screen).
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
    TransactionRepository transactionRepository;

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

        // 1. Create the document (left empty so the AI autofills its fields independently of the bank-derived values).
        Document document = new Document();
        document.setOrganization(organization);
        document.setAnalysisStatus(AnalysisStatus.PENDING);
        document.setUploadedBy(username);
        document.setDirection(direction);
        fileService.handleFileUpload(document, file);
        document.setDocumentStatus(DocumentStatus.UPLOADED);
        documentRepository.persist(document);

        // 2. Create the DRAFT transaction pre-filled from the bank movement.
        Transaction transaction = new Transaction();
        transaction.setOrganization(organization);
        transaction.setDocument(document);
        transaction.setCreatedBy(username);
        transaction.setStatus(TransactionStatus.DRAFT);
        transaction.setName(bankTx.getPurpose());
        transaction.setTotal(amount);
        transaction.setCurrencyCode(bankTx.getCurrency());
        if (bankTx.getBookingDate() != null) {
            transaction.setTransactionTime(bankTx.getBookingDate().atStartOfDay(ZoneOffset.UTC).toInstant());
        }
        if (bankTx.getBankAccount() != null) {
            transaction.setBommel(bankTx.getBankAccount().getBommel());
        }
        // Vertragspartner = counterparty of the bank movement. The entity places it on the side matching the
        // direction and records the organization on the other side.
        if (bankTx.getCounterpartyName() != null && !bankTx.getCounterpartyName().isBlank()) {
            TradeParty counterparty = new TradeParty();
            counterparty.setOrganization(organization);
            counterparty.setName(bankTx.getCounterpartyName());
            if (bankTx.getCounterpartyIban() != null && !bankTx.getCounterpartyIban().isBlank()) {
                counterparty.setVatId(bankTx.getCounterpartyIban());
            }
            transaction.setCounterparty(counterparty);
        } else {
            transaction.setCounterparty(null);
        }
        transactionRepository.persist(transaction);

        // 3. Wire up the relationships.
        document.setTransaction(transaction);
        matchService.addMatch(bankTxId, transaction.getId(), username);

        // 4. Kick off (or skip) the async AI analysis of the document.
        if (analyze) {
            documentCreatedEvent.fire(new DocumentCreatedEvent(document.getId()));
        } else {
            document.setAnalysisStatus(AnalysisStatus.SKIPPED);
        }

        // Notify list views (after commit) that a new receipt exists.
        documentChangedEvent.fire(new DocumentChangedEvent(document.getId(), organization.getId()));

        LOG.info("Created receipt+transaction for bank transaction: bankTxId={}, documentId={}, transactionId={}",
                bankTxId, document.getId(), transaction.getId());
        return DocumentResponse.from(document);
    }
}
