package app.hopps.transaction.repository;

import app.hopps.shared.security.OrganizationContext;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;

@ApplicationScoped
public class TransactionRepository implements PanacheRepository<Transaction> {

    @Inject
    OrganizationContext organizationContext;

    /**
     * Find all transactions for the current organization, ordered by creation date.
     */
    public List<Transaction> findAllForCurrentOrganization(Page page) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("organization.id = ?1", Sort.descending("createdAt"), orgId)
                .page(page)
                .list();
    }

    /**
     * Find a transaction by ID, scoped to current organization.
     */
    public Transaction findByIdScoped(Long id) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
    }

    /**
     * Find transactions by bommel ID for the current organization.
     */
    public List<Transaction> findByBommelId(Long bommelId, Page page) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("bommel.id = ?1 and organization.id = ?2",
                Sort.descending("createdAt"), bommelId, orgId)
                        .page(page)
                        .list();
    }

    /**
     * Find transactions without a bommel assignment.
     */
    public List<Transaction> findWithoutBommel(Page page) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("bommel is null and organization.id = ?1",
                Sort.descending("createdAt"), orgId)
                        .page(page)
                        .list();
    }

    /**
     * Find transactions by status for the current organization.
     */
    public List<Transaction> findByStatus(TransactionStatus status, Page page) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("status = ?1 and organization.id = ?2",
                Sort.descending("createdAt"), status, orgId)
                        .page(page)
                        .list();
    }

    /**
     * Find transactions by bommel and status.
     */
    public List<Transaction> findByBommelIdAndStatus(Long bommelId, TransactionStatus status, Page page) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("bommel.id = ?1 and status = ?2 and organization.id = ?3",
                Sort.descending("createdAt"), bommelId, status, orgId)
                        .page(page)
                        .list();
    }

    /**
     * Find transaction by document ID.
     */
    public Transaction findByDocumentId(Long documentId) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("document.id = ?1 and organization.id = ?2", documentId, orgId).firstResult();
    }
}
