package app.hopps.bankimport.repository;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.shared.security.OrganizationContext;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;

@ApplicationScoped
public class BankAccountRepository implements PanacheRepository<BankAccount> {

    @Inject
    OrganizationContext organizationContext;

    /**
     * List bank accounts of the current organization. By default, archived accounts are excluded.
     */
    public List<BankAccount> listForCurrentOrganization(boolean includeArchived) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        if (includeArchived) {
            return find("organization.id = ?1", Sort.ascending("name"), orgId).list();
        }
        return find("organization.id = ?1 and archived = false", Sort.ascending("name"), orgId).list();
    }

    /**
     * Find a bank account by ID, scoped to the current organization. Returns null if not found or not in org.
     */
    public BankAccount findByIdScoped(Long id) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
    }

    /**
     * Returns true if the current org has a bank account with the given IBAN (excluding archived). Used to prevent
     * duplicate IBAN entries within the same organization.
     */
    public boolean existsByIban(String iban, Long excludeId) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        if (excludeId == null) {
            return count("organization.id = ?1 and iban = ?2 and archived = false", orgId, iban) > 0;
        }
        return count("organization.id = ?1 and iban = ?2 and archived = false and id <> ?3", orgId, iban,
                excludeId) > 0;
    }
}
