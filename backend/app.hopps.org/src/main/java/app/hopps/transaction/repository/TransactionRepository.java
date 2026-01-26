package app.hopps.transaction.repository;

import app.hopps.shared.security.OrganizationContext;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    /**
     * Find transactions with dynamic filtering. Supports search, date range, bommel, category, document type, status,
     * and privatelyPaid filters.
     */
    public List<Transaction> findFiltered(
            String search,
            Instant startDate,
            Instant endDate,
            Long bommelId,
            Long categoryId,
            TransactionStatus status,
            Boolean privatelyPaid,
            Boolean detached,
            Page page) {

        Long orgId = organizationContext.getCurrentOrganizationId();

        // Build dynamic query
        StringBuilder query = new StringBuilder("organization.id = :orgId");
        Map<String, Object> params = new HashMap<>();
        params.put("orgId", orgId);

        // Search filter (name or senderName)
        if (search != null && !search.isBlank()) {
            query.append(" and (LOWER(name) LIKE :search OR LOWER(sender.name) LIKE :search)");
            params.put("search", "%" + search.toLowerCase() + "%");
        }

        // Date range filter
        if (startDate != null) {
            query.append(" and transactionTime >= :startDate");
            params.put("startDate", startDate);
        }
        if (endDate != null) {
            query.append(" and transactionTime <= :endDate");
            params.put("endDate", endDate);
        }

        // Bommel filter
        if (detached != null && detached) {
            query.append(" and bommel is null");
        } else if (bommelId != null) {
            query.append(" and bommel.id = :bommelId");
            params.put("bommelId", bommelId);
        }

        // Category filter
        if (categoryId != null) {
            query.append(" and category.id = :categoryId");
            params.put("categoryId", categoryId);
        }

        // Status filter
        if (status != null) {
            query.append(" and status = :status");
            params.put("status", status);
        }

        // Privately paid filter
        if (privatelyPaid != null) {
            query.append(" and privatelyPaid = :privatelyPaid");
            params.put("privatelyPaid", privatelyPaid);
        }

        return find(query.toString(), Sort.descending("createdAt"), params)
                .page(page)
                .list();
    }

    /**
     * Count transactions with dynamic filtering.
     */
    public long countFiltered(
            String search,
            Instant startDate,
            Instant endDate,
            Long bommelId,
            Long categoryId,
            TransactionStatus status,
            Boolean privatelyPaid,
            Boolean detached) {

        Long orgId = organizationContext.getCurrentOrganizationId();

        // Build dynamic query (same as findFiltered)
        StringBuilder query = new StringBuilder("organization.id = :orgId");
        Map<String, Object> params = new HashMap<>();
        params.put("orgId", orgId);

        if (search != null && !search.isBlank()) {
            query.append(" and (LOWER(name) LIKE :search OR LOWER(sender.name) LIKE :search)");
            params.put("search", "%" + search.toLowerCase() + "%");
        }

        if (startDate != null) {
            query.append(" and transactionTime >= :startDate");
            params.put("startDate", startDate);
        }
        if (endDate != null) {
            query.append(" and transactionTime <= :endDate");
            params.put("endDate", endDate);
        }

        if (detached != null && detached) {
            query.append(" and bommel is null");
        } else if (bommelId != null) {
            query.append(" and bommel.id = :bommelId");
            params.put("bommelId", bommelId);
        }

        if (categoryId != null) {
            query.append(" and category.id = :categoryId");
            params.put("categoryId", categoryId);
        }

        if (status != null) {
            query.append(" and status = :status");
            params.put("status", status);
        }

        if (privatelyPaid != null) {
            query.append(" and privatelyPaid = :privatelyPaid");
            params.put("privatelyPaid", privatelyPaid);
        }

        return count(query.toString(), params);
    }
}
