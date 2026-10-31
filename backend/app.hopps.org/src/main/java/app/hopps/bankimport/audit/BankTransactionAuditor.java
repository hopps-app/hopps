package app.hopps.bankimport.audit;

import app.hopps.audit.domain.AuditAction;
import app.hopps.audit.domain.AuditEntityType;
import app.hopps.audit.service.AuditDiff;
import app.hopps.audit.service.AuditService;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionStatus;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Audit of what a user does to a bank transaction itself: ignoring it and taking that back. Its links to bookkeeping
 * transactions are recorded on those transactions (see {@code TransactionAuditor}), so they are not repeated here.
 */
@ApplicationScoped
public class BankTransactionAuditor {

    @Inject
    AuditService audit;

    /** Records that the bank transaction was ignored; {@code before} is its status until then. */
    public void ignored(BankTransaction bankTx, BankTransactionStatus before) {
        statusChanged(bankTx, before, AuditAction.IGNORE);
    }

    /** Records that ignoring was taken back; the status is then whatever its links give it. */
    public void unignored(BankTransaction bankTx, BankTransactionStatus before) {
        statusChanged(bankTx, before, AuditAction.UNIGNORE);
    }

    /** Writes nothing when the status did not change (ignoring an ignored one, un-ignoring one that was not). */
    private void statusChanged(BankTransaction bankTx, BankTransactionStatus before, AuditAction action) {
        if (before == bankTx.getStatus()) {
            return;
        }
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("status", AuditDiff.change(name(before), name(bankTx.getStatus())));
        Long organizationId = bankTx.getOrganization() == null ? null : bankTx.getOrganization().getId();
        audit.record(AuditEntityType.BANK_TRANSACTION, organizationId, bankTx.getId(), action, changes, null);
    }

    private static String name(BankTransactionStatus status) {
        return status == null ? null : status.name();
    }
}
