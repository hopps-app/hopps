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
     * <p>
     * When {@code search} is a numeric amount, exact amount matches (full or still-open) are ordered first so the
     * intended reconciliation candidate surfaces at the top and cannot be pushed off the page by the many
     * same-/similar-amount or textually matching transactions that a large account accumulates.
     */
    public List<BankTransaction> findFiltered(
            List<Long> accountIds,
            LocalDate fromDate,
            LocalDate toDate,
            List<BankTransactionStatus> statuses,
            String search,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            String sortBy,
            boolean ascending,
            Page page) {
        if (accountIds != null && accountIds.isEmpty()) {
            return List.of();
        }
        Map<String, Object> params = new HashMap<>();
        String where = buildAggregateWhere(accountIds, fromDate, toDate, statuses, search, minAmount, maxAmount,
                params);
        String orderBy = buildOrderBy(sortBy, ascending, params.containsKey("searchAmount"));

        var query = getEntityManager().createQuery(
                "SELECT t FROM BankTransaction t WHERE " + where + " ORDER BY " + orderBy, BankTransaction.class);
        params.forEach(query::setParameter);
        query.setFirstResult(page.index * page.size);
        query.setMaxResults(page.size);
        return query.getResultList();
    }

    /**
     * Builds a whitelisted ORDER BY clause for the transaction listing. Only a fixed set of columns may be sorted on
     * (to prevent injecting arbitrary JPQL paths); anything else falls back to {@code bookingDate}. When a numeric
     * amount was searched for ({@code searchAmount} bound), exact amount matches are ranked first. A descending
     * {@code id} is always appended as a stable tie-breaker.
     */
    private static String buildOrderBy(String sortBy, boolean ascending, boolean hasSearchAmount) {
        String column = switch (sortBy == null ? "" : sortBy) {
            case "amount" -> "amount";
            case "counterpartyName" -> "counterpartyName";
            default -> "bookingDate";
        };
        String direction = ascending ? "ASC" : "DESC";
        StringBuilder orderBy = new StringBuilder();
        if (hasSearchAmount) {
            // Exact amount matches (full amount or the still-open remainder) come first — same predicate as the
            // amount clause built in buildAggregateWhere, reusing its :searchAmount parameter.
            orderBy.append(
                    "CASE WHEN abs(t.amount) = :searchAmount OR abs(t.amount) - t.matchedAmount = :searchAmount THEN 0 ELSE 1 END ASC, ");
        }
        orderBy.append("t.").append(column).append(' ').append(direction).append(", t.id DESC");
        return orderBy.toString();
    }

    /** Returns [sumIncoming, sumOutgoing] for the same filter set. Net = sumIncoming + sumOutgoing (signed). */
    public BigDecimal[] aggregate(
            List<Long> accountIds,
            LocalDate fromDate,
            LocalDate toDate,
            List<BankTransactionStatus> statuses,
            String search,
            BigDecimal minAmount,
            BigDecimal maxAmount) {
        if (accountIds != null && accountIds.isEmpty()) {
            return new BigDecimal[] { BigDecimal.ZERO, BigDecimal.ZERO };
        }
        Map<String, Object> params = new HashMap<>();
        String where = buildAggregateWhere(accountIds, fromDate, toDate, statuses, search, minAmount, maxAmount,
                params);

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

    /**
     * Counts the transactions matching the same filter set as {@link #findFiltered}. Used for pagination and the
     * reconciliation badges, so the total is not capped by a page size.
     */
    public long countFiltered(
            List<Long> accountIds,
            LocalDate fromDate,
            LocalDate toDate,
            List<BankTransactionStatus> statuses,
            String search,
            BigDecimal minAmount,
            BigDecimal maxAmount) {
        if (accountIds != null && accountIds.isEmpty()) {
            return 0L;
        }
        Map<String, Object> params = new HashMap<>();
        String where = buildAggregateWhere(accountIds, fromDate, toDate, statuses, search, minAmount, maxAmount,
                params);

        var query = getEntityManager().createQuery("SELECT COUNT(t) FROM BankTransaction t WHERE " + where, Long.class);
        params.forEach(query::setParameter);
        return query.getSingleResult();
    }

    /**
     * Builds the shared WHERE clause (org scope + optional filters) for the aggregate/count queries and fills
     * {@code params}. Callers must handle the empty-{@code accountIds} case (no results) before calling this.
     */
    private String buildAggregateWhere(
            List<Long> accountIds,
            LocalDate fromDate,
            LocalDate toDate,
            List<BankTransactionStatus> statuses,
            String search,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            Map<String, Object> params) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        StringBuilder where = new StringBuilder("t.organization.id = :orgId");
        params.put("orgId", orgId);

        if (accountIds != null) {
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
        // Amount range filters on the *magnitude* (abs), mirroring how the free-text search matches an amount and how
        // the user reads the signed Amount column: e.g. "50–100" matches both a +75 income and a -75 expense.
        if (minAmount != null) {
            where.append(" AND abs(t.amount) >= :minAmount");
            params.put("minAmount", minAmount.abs());
        }
        if (maxAmount != null) {
            where.append(" AND abs(t.amount) <= :maxAmount");
            params.put("maxAmount", maxAmount.abs());
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
        return where.toString();
    }

    public List<BankTransaction> findByImport(Long importId) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("organization.id = ?1 and bankImport.id = ?2",
                Sort.ascending("bookingDate"), orgId, importId).list();
    }

    public long deleteByImport(Long importId) {
        return delete("bankImport.id = ?1", importId);
    }

    /**
     * Computes the current balance as the account's opening balance plus the sum of all transaction amounts booked
     * strictly after the opening balance date. Only transactions after that date are added, because the opening balance
     * already reflects everything up to and including it — so after a gap-free import the result matches the balance
     * shown by the bank. When no opening date is set, all transactions of the account are summed.
     */
    public BigDecimal computeBalance(Long bankAccountId, BigDecimal opening, LocalDate openingDate) {
        String jpql = "SELECT COALESCE(SUM(t.amount), 0) FROM BankTransaction t WHERE t.bankAccount.id = :id"
                + (openingDate != null ? " AND t.bookingDate > :openingDate" : "");
        var query = getEntityManager().createQuery(jpql, BigDecimal.class)
                .setParameter("id", bankAccountId);
        if (openingDate != null) {
            query.setParameter("openingDate", openingDate);
        }
        BigDecimal sum = query.getSingleResult();
        return (opening == null ? BigDecimal.ZERO : opening).add(sum);
    }

    public List<BankTransaction> findForAccount(Long bankAccountId, Page page) {
        return findFiltered(new ArrayList<>(List.of(bankAccountId)), null, null, null, null, null, null, null, false,
                page);
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
