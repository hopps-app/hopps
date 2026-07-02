package app.hopps.bankimport.repository;

import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionStatus;
import app.hopps.shared.security.OrganizationContext;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@ApplicationScoped
public class BankTransactionRepository implements PanacheRepository<BankTransaction> {

    @Inject
    OrganizationContext organizationContext;

    public BankTransaction findByIdScoped(Long id) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
    }

    public Set<String> findExistingDedupeHashes(Long bankAccountId, Set<String> hashes) {
        if (hashes == null || hashes.isEmpty()) {
            return Set.of();
        }
        List<String> existing = getEntityManager()
                .createQuery(
                        "SELECT t.dedupeHash FROM BankTransaction t " +
                                "WHERE t.bankAccount.id = :accountId AND t.dedupeHash IN :hashes",
                        String.class)
                .setParameter("accountId", bankAccountId)
                .setParameter("hashes", hashes)
                .getResultList();
        return Set.copyOf(existing);
    }

    /**
     * Cross-account listing scoped to the current organization, with optional filters. {@code accountIds=null} means
     * all accounts; empty list means no result.
     */
    public List<BankTransaction> findFiltered(
            List<Long> accountIds,
            LocalDate fromDate,
            LocalDate toDate,
            List<BankTransactionStatus> statuses,
            String search,
            Page page) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        StringBuilder query = new StringBuilder("organization.id = :orgId");
        Map<String, Object> params = new HashMap<>();
        params.put("orgId", orgId);

        if (accountIds != null) {
            if (accountIds.isEmpty()) {
                return List.of();
            }
            query.append(" and bankAccount.id in :accountIds");
            params.put("accountIds", accountIds);
        }
        if (fromDate != null) {
            query.append(" and bookingDate >= :fromDate");
            params.put("fromDate", fromDate);
        }
        if (toDate != null) {
            query.append(" and bookingDate <= :toDate");
            params.put("toDate", toDate);
        }
        if (statuses != null && !statuses.isEmpty()) {
            query.append(" and status in :statuses");
            params.put("statuses", statuses);
        }
        if (search != null && !search.isBlank()) {
            query.append(" and (lower(purpose) like :search or lower(counterpartyName) like :search");
            params.put("search", "%" + search.toLowerCase() + "%");
            BigDecimal amount = parseSearchAmount(search);
            if (amount != null) {
                // A numeric search term additionally matches the amount, on the absolute value so the sign
                // convention (outgoing = negative) is irrelevant to the user. Both the full amount and the
                // still-open amount (full minus already matched) are matched, so a receipt can be found by the
                // remaining amount shown in the picker.
                query.append(" or abs(amount) = :searchAmount or abs(amount) - matchedAmount = :searchAmount");
                params.put("searchAmount", amount.abs());
            }
            query.append(")");
        }

        return find(query.toString(),
                Sort.descending("bookingDate").and("id", Sort.Direction.Descending), params)
                        .page(page)
                        .list();
    }

    /** Returns [sumIncoming, sumOutgoing] for the same filter set. Net = sumIncoming + sumOutgoing (signed). */
    public BigDecimal[] aggregate(
            List<Long> accountIds,
            LocalDate fromDate,
            LocalDate toDate,
            List<BankTransactionStatus> statuses,
            String search) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        StringBuilder where = new StringBuilder("t.organization.id = :orgId");
        Map<String, Object> params = new HashMap<>();
        params.put("orgId", orgId);

        if (accountIds != null) {
            if (accountIds.isEmpty()) {
                return new BigDecimal[] { BigDecimal.ZERO, BigDecimal.ZERO };
            }
            where.append(" AND t.bankAccount.id IN :accountIds");
            params.put("accountIds", accountIds);
        }
        if (fromDate != null) {
            where.append(" AND t.bookingDate >= :fromDate");
            params.put("fromDate", fromDate);
        }
        if (toDate != null) {
            where.append(" AND t.bookingDate <= :toDate");
            params.put("toDate", toDate);
        }
        if (statuses != null && !statuses.isEmpty()) {
            where.append(" AND t.status IN :statuses");
            params.put("statuses", statuses);
        }
        if (search != null && !search.isBlank()) {
            where.append(" AND (lower(t.purpose) LIKE :search OR lower(t.counterpartyName) LIKE :search");
            params.put("search", "%" + search.toLowerCase() + "%");
            BigDecimal amount = parseSearchAmount(search);
            if (amount != null) {
                where.append(" OR abs(t.amount) = :searchAmount OR abs(t.amount) - t.matchedAmount = :searchAmount");
                params.put("searchAmount", amount.abs());
            }
            where.append(")");
        }

        String jpql = "SELECT " +
                "COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0), " +
                "COALESCE(SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END), 0) " +
                "FROM BankTransaction t WHERE " + where;

        var query = getEntityManager().createQuery(jpql, Object[].class);
        params.forEach(query::setParameter);
        Object[] result = query.getSingleResult();
        return new BigDecimal[] {
                (BigDecimal) result[0],
                (BigDecimal) result[1]
        };
    }

    public List<BankTransaction> findByImport(Long importId) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("organization.id = ?1 and bankImport.id = ?2",
                Sort.ascending("bookingDate"), orgId, importId).list();
    }

    public long deleteByImport(Long importId) {
        return delete("bankImport.id = ?1", importId);
    }

    /** Computes the running balance starting from the account's opening balance + sum of imported amounts. */
    public BigDecimal computeBalance(Long bankAccountId, BigDecimal opening) {
        BigDecimal sum = (BigDecimal) getEntityManager()
                .createQuery("SELECT COALESCE(SUM(t.amount), 0) FROM BankTransaction t WHERE t.bankAccount.id = :id")
                .setParameter("id", bankAccountId)
                .getSingleResult();
        return (opening == null ? BigDecimal.ZERO : opening).add(sum);
    }

    public List<BankTransaction> findForAccount(Long bankAccountId, Page page) {
        return findFiltered(new ArrayList<>(List.of(bankAccountId)), null, null, null, null, page);
    }

    /**
     * Parses a free-text search term as a monetary amount so it can additionally be matched against the transaction
     * amount. Accepts both comma and dot as decimal separator; returns {@code null} for non-numeric terms.
     */
    private static BigDecimal parseSearchAmount(String search) {
        String normalized = search.trim().replace(" ", "").replace(",", ".");
        try {
            return new BigDecimal(normalized);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Returns status counts per import ID for all given import IDs in a single query. Result map: importId → (status →
     * count). Import IDs with no transactions are absent from the outer map.
     */
    public Map<Long, Map<BankTransactionStatus, Long>> countStatusesByImports(Collection<Long> importIds) {
        if (importIds == null || importIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows = getEntityManager()
                .createQuery(
                        "SELECT t.bankImport.id, t.status, COUNT(t) FROM BankTransaction t " +
                                "WHERE t.bankImport.id IN :importIds GROUP BY t.bankImport.id, t.status",
                        Object[].class)
                .setParameter("importIds", importIds)
                .getResultList();

        Map<Long, Map<BankTransactionStatus, Long>> result = new HashMap<>();
        for (Object[] row : rows) {
            Long importId = (Long) row[0];
            BankTransactionStatus status = (BankTransactionStatus) row[1];
            long count = (Long) row[2];
            result.computeIfAbsent(importId, k -> new EnumMap<>(BankTransactionStatus.class))
                    .put(status, count);
        }
        return result;
    }
}
