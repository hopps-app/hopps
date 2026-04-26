package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankCsvSchema;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;
import app.hopps.bankimport.repository.BankImportRepository;
import app.hopps.bankimport.repository.BankTransactionRepository;
import app.hopps.shared.security.OrganizationContext;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;

/**
 * Coordinates the user-facing side of the import lifecycle: enqueueing a new job, listing per-account history, fetching
 * status, and rolling back transactions of a failed/unwanted import. The actual parsing happens in
 * {@link CsvImportService}, kicked off asynchronously by {@link BankImportWorker}.
 */
@ApplicationScoped
public class BankImportService {

    private static final Logger LOG = LoggerFactory.getLogger(BankImportService.class);

    @Inject
    BankAccountService bankAccountService;

    @Inject
    BankCsvSchemaService schemaService;

    @Inject
    BankImportRepository importRepository;

    @Inject
    BankTransactionRepository transactionRepository;

    @Inject
    ImportFileStorageService fileStorage;

    @Inject
    OrganizationContext organizationContext;

    @Inject
    SecurityIdentity securityIdentity;

    /**
     * Reads the uploaded file, validates the request, archives the original to S3 and enqueues a {@link BankImport}
     * record in {@code QUEUED} state. The worker will pick it up within a few seconds.
     */
    @Transactional
    public BankImport enqueueImport(Long bankAccountId, Long schemaId, String fileName, long fileSize,
            String contentType, Path tempFile) {
        BankAccount account = bankAccountService.get(bankAccountId);
        if (account.isArchived()) {
            throw new BadRequestException("Cannot import into an archived account");
        }
        BankCsvSchema schema = schemaService.get(schemaId);
        byte[] content;
        try {
            content = Files.readAllBytes(tempFile);
        } catch (IOException e) {
            throw new BadRequestException("Could not read uploaded file: " + e.getMessage());
        }

        String sha256 = DedupeHashService.sha256(content);
        if (importRepository.existsActiveBySha(bankAccountId, sha256)) {
            throw new BadRequestException("An identical file is already queued or processing for this account");
        }

        Long orgId = organizationContext.getCurrentOrganizationId();
        String s3Key = fileStorage.storeImportFile(orgId, fileName, content, contentType);

        BankImport job = new BankImport();
        job.setOrganization(account.getOrganization());
        job.setBankAccount(account);
        job.setSchema(schema);
        job.setFileName(fileName);
        job.setFileSize(fileSize);
        job.setFileSha256(sha256);
        job.setS3FileKey(s3Key);
        job.setImportedBy(securityIdentity.getPrincipal().getName());
        job.setStatus(BankImportStatus.QUEUED);
        job.persist();
        LOG.info("Bank import queued: id={}, account={}, file={}, sha={}",
                job.getId(), bankAccountId, fileName, sha256);
        return job;
    }

    public List<BankImport> listForAccount(Long bankAccountId) {
        // Force the account-scoping check.
        bankAccountService.get(bankAccountId);
        return importRepository.listForAccount(bankAccountId);
    }

    public BankImport get(Long id) {
        BankImport job = importRepository.findByIdScoped(id);
        if (job == null) {
            throw new NotFoundException("Bank import not found");
        }
        return job;
    }

    /**
     * Deletes all {@link app.hopps.bankimport.domain.BankTransaction}s of a finished import and removes the import
     * record itself. Cannot be applied while the worker is still processing.
     */
    @Transactional
    public void rollback(Long id) {
        BankImport job = get(id);
        if (job.getStatus() == BankImportStatus.PROCESSING || job.getStatus() == BankImportStatus.QUEUED) {
            throw new BadRequestException("Cannot rollback an import that is still in progress");
        }
        long deleted = transactionRepository.deleteByImport(job.getId());
        importRepository.delete(job);
        LOG.info("Bank import {} rolled back, removed {} transactions", id, deleted);
    }

    @Transactional
    public BankImport markStarted(Long id) {
        BankImport job = get(id);
        if (job.getStatus() == BankImportStatus.QUEUED) {
            job.setStatus(BankImportStatus.PROCESSING);
            job.setStartedAt(Instant.now());
        }
        return job;
    }
}
