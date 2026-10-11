package app.hopps.bankimport.audit;

import app.hopps.audit.domain.AuditEntityType;
import app.hopps.audit.service.AuditService;
import app.hopps.audit.service.EntityAuditor;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankTransactionStatus;
import app.hopps.transaction.audit.TransactionSnapshot;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Audit of deleting a bank import. Deleting one removes its bank transactions and with them their links to bookkeeping
 * transactions, so the entry keeps what the import was, how many of its movements were assigned or ignored, and which
 * links went with it.
 */
@ApplicationScoped
public class BankImportAuditor implements EntityAuditor<BankImport> {

    @Inject
    AuditService audit;

    @Inject
    EntityManager em;

    @Override
    public AuditEntityType entityType() {
        return AuditEntityType.BANK_IMPORT;
    }

    @Override
    public Long entityId(BankImport job) {
        return job.getId();
    }

    @Override
    public Long organizationId(BankImport job) {
        return job.getOrganization() == null ? null : job.getOrganization().getId();
    }

    @Override
    public Map<String, Object> snapshot(BankImport job) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("fileName", job.getFileName());
        snapshot.put("bankAccountId", job.getBankAccount() == null ? null : job.getBankAccount().getId());
        snapshot.put("bankAccountName", job.getBankAccount() == null ? null : job.getBankAccount().getName());
        snapshot.put("status", job.getStatus() == null ? null : job.getStatus().name());
        snapshot.put("importedBy", job.getImportedBy());
        snapshot.put("importedAt", job.getImportedAt() == null ? null : job.getImportedAt().toString());
        snapshot.put("totalRows", job.getTotalRows());
        snapshot.put("importedRows", job.getImportedRows());
        snapshot.put("duplicateRows", job.getDuplicateRows());
        return snapshot;
    }

    /**
     * Records the deletion. Call it before the import's bank transactions are removed, so their statuses and links can
     * still be read.
     */
    public void deleted(BankImport job, Map<BankTransactionStatus, Long> statusCounts) {
        Map<String, Object> snapshot = snapshot(job);
        long total = statusCounts.values().stream().mapToLong(Long::longValue).sum();
        snapshot.put("bankTransactions", total);
        snapshot.put("assigned", statusCounts.getOrDefault(BankTransactionStatus.FULLY_MATCHED, 0L)
                + statusCounts.getOrDefault(BankTransactionStatus.PARTIALLY_MATCHED, 0L));
        snapshot.put("ignored", statusCounts.getOrDefault(BankTransactionStatus.IGNORED, 0L));
        snapshot.put("removedLinks", links(job.getId()));
        audit.deleted(this, job, snapshot);
    }

    private List<Object> links(Long importId) {
        List<Object[]> rows = em.createQuery(
                "SELECT m.bankTransaction.id, m.transaction.id, m.matchedAmount FROM BankTransactionMatch m "
                        + "WHERE m.bankTransaction.bankImport.id = :importId ORDER BY m.id",
                Object[].class)
                .setParameter("importId", importId)
                .getResultList();
        List<Object> links = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> link = new LinkedHashMap<>();
            link.put("bankTransactionId", row[0]);
            link.put("transactionId", row[1]);
            link.put("matchedAmount", TransactionSnapshot.amount((BigDecimal) row[2]));
            links.add(link);
        }
        return links;
    }
}
