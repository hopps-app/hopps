package app.hopps.bankimport.repository;

import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;
import app.hopps.shared.security.OrganizationContext;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class BankImportRepository implements PanacheRepository<BankImport> {

    @Inject
    OrganizationContext organizationContext;

    public List<BankImport> listForAccount(Long bankAccountId) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("organization.id = ?1 and bankAccount.id = ?2",
                Sort.descending("importedAt"), orgId, bankAccountId).list();
    }

    public BankImport findByIdScoped(Long id) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
    }

    /** Worker-side: returns the oldest QUEUED job (no org scoping — runs as a system task). */
    public Optional<BankImport> findNextQueued() {
        return find("status = ?1", Sort.ascending("importedAt"), BankImportStatus.QUEUED).firstResultOptional();
    }

    /** Returns true if a QUEUED or PROCESSING import already references this file SHA for the given account. */
    public boolean existsActiveBySha(Long bankAccountId, String sha256) {
        return count(
                "bankAccount.id = ?1 and fileSha256 = ?2 and (status = ?3 or status = ?4)",
                bankAccountId, sha256, BankImportStatus.QUEUED, BankImportStatus.PROCESSING) > 0;
    }
}
