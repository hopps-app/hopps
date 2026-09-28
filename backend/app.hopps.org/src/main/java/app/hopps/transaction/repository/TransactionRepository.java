package app.hopps.transaction.repository;

import app.hopps.shared.security.OrganizationContext;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionDisplayStatus;
import app.hopps.transaction.domain.TransactionStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
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
     * Find transactions with dynamic filtering. Supports search, date range, bommel, document type, status, and
     * privatelyPaid filters.
     */
    public List<Transaction> findFiltered(
            String search,
            Instant startDate,
            Instant endDate,
            List<Long> bommelIds,
            TransactionStatus status,
            List<TransactionDisplayStatus> displayStatuses,
            Boolean privatelyPaid,
            Boolean detached,
            List<String> categoryValues,
            Sort sort,
            Page page) {

        Long orgId = organizationContext.getCurrentOrganizationId();

        // Build dynamic query
        StringBuilder query = new StringBuilder("organization.id = :orgId");
        Map<String, Object> params = new HashMap<>();
        params.put("orgId", orgId);

        // Search filter: name and counterparty (sender/recipient) by text, plus the amount when the term is numeric —
        // so a bank amount can be pasted to find the matching transaction (mirrors the bank-transaction search).
        if (search != null && !search.isBlank()) {
            // Match the counterparty name via an id-subquery on TradeParty instead of a path expression
            // (sender.name / recipient.name), which would force INNER joins and drop every transaction that has only
            // one side set (the other counterparty is always null) — making the whole search return nothing.
            query.append(" and (LOWER(name) LIKE :search"
                    + " OR sender.id IN (SELECT tp.id FROM TradeParty tp WHERE LOWER(tp.name) LIKE :search)"
                    + " OR recipient.id IN (SELECT tp.id FROM TradeParty tp WHERE LOWER(tp.name) LIKE :search)");
            params.put("search", "%" + search.toLowerCase() + "%");
            BigDecimal searchAmount = parseSearchAmount(search);
            if (searchAmount != null) {
                query.append(" OR abs(total) = :searchAmount");
                params.put("searchAmount", searchAmount.abs());
            }
            query.append(")");
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
        } else if (bommelIds != null && !bommelIds.isEmpty()) {
            query.append(" and bommel.id in :bommelIds");
            params.put("bommelIds", bommelIds);
        }

        // Status filter
        if (status != null) {
            query.append(" and status = :status");
            params.put("status", status);
        }
        appendDisplayStatusFilter(query, params, displayStatuses, "");

        // Privately paid filter
        if (privatelyPaid != null) {
            query.append(" and privatelyPaid = :privatelyPaid");
            params.put("privatelyPaid", privatelyPaid);
        }

        // Category-group value filters (AND across groups)
        appendCategoryFilters(query, params, categoryValues, "");

        return find(query.toString(), sort != null ? sort : Sort.descending("createdAt"), params)
                .page(page)
                .list();
    }

    /**
     * Parses a free-text search term as a monetary amount so it can additionally be matched against the transaction
     * total. Accepts both comma and dot as decimal separator; returns {@code null} for non-numeric terms.
     */
    private static BigDecimal parseSearchAmount(String search) {
        String normalized = search.trim().replace(" ", "").replace(",", ".");
        try {
            return new BigDecimal(normalized);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // Signed bank coverage of one transaction, as in BankTransactionMatchService#getCoveredAmountForTransaction: every
    // allocation counts in the direction of the movement it comes from, so opposite movements net out.
    private static final String SIGNED_COVERAGE = "SUM(CASE WHEN m.bankTransaction.amount < 0 THEN -m.matchedAmount ELSE m.matchedAmount END)";

    /**
     * Appends the filter for the derived display status (see {@link TransactionDisplayStatus}); several statuses OR
     * together. Coverage is compared with the transaction's total, so it is read from the matches with a grouped
     * id-subquery, like the category filter and for the same reason: Panache's implicit-entity queries have no alias to
     * correlate a subquery with, and {@code id} inside it would bind to the match. Nothing is added when no status is
     * requested or when all four are, since that excludes nothing.
     *
     * @param prefix
     *            {@code ""} for Panache find/count (implicit entity) or {@code "t."} for the aliased aggregate JPQL
     */
    // Package-private so the clause building can be unit-tested without standing up a database.
    static void appendDisplayStatusFilter(StringBuilder query, Map<String, Object> params,
            List<TransactionDisplayStatus> displayStatuses, String prefix) {
        if (displayStatuses == null || displayStatuses.isEmpty()) {
            return;
        }
        EnumSet<TransactionDisplayStatus> wanted = EnumSet.copyOf(displayStatuses);
        if (wanted.size() == TransactionDisplayStatus.values().length) {
            return;
        }

        String matched = "SELECT m.transaction.id FROM BankTransactionMatch m GROUP BY m.transaction.id, m.transaction.total";
        // Ids whose net coverage is not zero, i.e. at least one movement is effectively linked.
        String linkedIds = "SELECT m.transaction.id FROM BankTransactionMatch m GROUP BY m.transaction.id HAVING "
                + SIGNED_COVERAGE + " <> 0";
        String total = "COALESCE(m.transaction.total, 0)";

        List<String> clauses = new ArrayList<>();
        if (wanted.contains(TransactionDisplayStatus.DRAFT)) {
            clauses.add("(" + prefix + "status = :dsDraft AND " + prefix + "id NOT IN (" + linkedIds + "))");
        }
        if (wanted.contains(TransactionDisplayStatus.PARTIAL)) {
            clauses.add("(" + prefix + "status = :dsDraft AND " + prefix + "id IN (" + matched + " HAVING "
                    + SIGNED_COVERAGE + " <> 0 AND " + SIGNED_COVERAGE + " <> " + total + "))");
        }
        if (wanted.contains(TransactionDisplayStatus.LINKED)) {
            clauses.add("(" + prefix + "status = :dsDraft AND " + prefix + "id IN (" + matched + " HAVING "
                    + SIGNED_COVERAGE + " <> 0 AND " + SIGNED_COVERAGE + " = " + total + "))");
        }
        if (wanted.contains(TransactionDisplayStatus.CONFIRMED)) {
            clauses.add("(" + prefix + "status = :dsConfirmed)");
        }

        query.append(" and (").append(String.join(" or ", clauses)).append(")");
        // Bind only what the clauses use; Hibernate rejects a parameter the query does not name.
        if (wanted.size() > 1 || !wanted.contains(TransactionDisplayStatus.CONFIRMED)) {
            params.put("dsDraft", TransactionStatus.DRAFT);
        }
        if (wanted.contains(TransactionDisplayStatus.CONFIRMED)) {
            params.put("dsConfirmed", TransactionStatus.CONFIRMED);
        }
    }

    /**
     * Appends one AND clause per requested category <em>group</em>. Each entry is a {@code "groupId:value"} pair; only
     * the first colon separates the (always numeric) group id from the value, so a value may itself contain colons.
     * Entries are grouped by their group id: values within one group OR together, and the groups AND together — a
     * transaction must match <em>one of</em> the requested values in <em>every</em> requested group. ANDing several
     * values of the same group would be unsatisfiable, since a transaction carries at most one value per group. Each
     * clause is an id-subquery against {@link app.hopps.transaction.domain.TransactionCategoryValue} (matched on its
     * soft-FK {@code categoryGroupId} and the snapshot {@code value} text) rather than a join, so it neither multiplies
     * nor drops rows. Malformed entries are skipped.
     *
     * @param prefix
     *            {@code ""} for Panache find/count (implicit entity) or {@code "t."} for the aliased aggregate JPQL
     */
    // Package-private so the grouping rule can be unit-tested without standing up a database.
    static void appendCategoryFilters(StringBuilder query, Map<String, Object> params,
            List<String> categoryValues, String prefix) {
        if (categoryValues == null) {
            return;
        }
        Map<Long, List<String>> valuesByGroup = new LinkedHashMap<>();
        for (String entry : categoryValues) {
            if (entry == null) {
                continue;
            }
            int sep = entry.indexOf(':');
            // need a non-empty id and a non-empty value
            if (sep <= 0 || sep == entry.length() - 1) {
                continue;
            }
            Long groupId;
            try {
                groupId = Long.parseLong(entry.substring(0, sep).trim());
            } catch (NumberFormatException e) {
                continue;
            }
            String value = entry.substring(sep + 1);
            List<String> groupValues = valuesByGroup.computeIfAbsent(groupId, k -> new ArrayList<>());
            if (!groupValues.contains(value)) {
                groupValues.add(value);
            }
        }

        int i = 0;
        for (Map.Entry<Long, List<String>> group : valuesByGroup.entrySet()) {
            String gp = "cgId" + i;
            String vp = "cgVal" + i;
            query.append(" and ")
                    .append(prefix)
                    .append("id IN (SELECT cv.transaction.id FROM TransactionCategoryValue cv"
                            + " WHERE cv.categoryGroupId = :")
                    .append(gp)
                    .append(" AND cv.value IN :")
                    .append(vp)
                    .append(")");
            params.put(gp, group.getKey());
            params.put(vp, group.getValue());
            i++;
        }
    }

    /**
     * Count transactions with dynamic filtering.
     */
    public long countFiltered(
            String search,
            Instant startDate,
            Instant endDate,
            List<Long> bommelIds,
            TransactionStatus status,
            List<TransactionDisplayStatus> displayStatuses,
            Boolean privatelyPaid,
            Boolean detached,
            List<String> categoryValues) {

        Long orgId = organizationContext.getCurrentOrganizationId();

        // Build dynamic query (same as findFiltered)
        StringBuilder query = new StringBuilder("organization.id = :orgId");
        Map<String, Object> params = new HashMap<>();
        params.put("orgId", orgId);

        if (search != null && !search.isBlank()) {
            // Match the counterparty name via an id-subquery on TradeParty instead of a path expression
            // (sender.name / recipient.name), which would force INNER joins and drop every transaction that has only
            // one side set (the other counterparty is always null) — making the whole search return nothing.
            query.append(" and (LOWER(name) LIKE :search"
                    + " OR sender.id IN (SELECT tp.id FROM TradeParty tp WHERE LOWER(tp.name) LIKE :search)"
                    + " OR recipient.id IN (SELECT tp.id FROM TradeParty tp WHERE LOWER(tp.name) LIKE :search)");
            params.put("search", "%" + search.toLowerCase() + "%");
            BigDecimal searchAmount = parseSearchAmount(search);
            if (searchAmount != null) {
                query.append(" OR abs(total) = :searchAmount");
                params.put("searchAmount", searchAmount.abs());
            }
            query.append(")");
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
        } else if (bommelIds != null && !bommelIds.isEmpty()) {
            query.append(" and bommel.id in :bommelIds");
            params.put("bommelIds", bommelIds);
        }

        if (status != null) {
            query.append(" and status = :status");
            params.put("status", status);
        }
        appendDisplayStatusFilter(query, params, displayStatuses, "");

        if (privatelyPaid != null) {
            query.append(" and privatelyPaid = :privatelyPaid");
            params.put("privatelyPaid", privatelyPaid);
        }

        appendCategoryFilters(query, params, categoryValues, "");

        return count(query.toString(), params);
    }

    /**
     * Sums income (positive totals) and expenses (magnitude of negative totals) for the same filter set as
     * {@link #findFiltered}. Returns {@code [income, expense]} — both non-negative; null totals (drafts without an
     * amount) contribute to neither. Combine with {@link #countFiltered} to build the paged overview totals.
     */
    public BigDecimal[] aggregate(
            String search,
            Instant startDate,
            Instant endDate,
            List<Long> bommelIds,
            TransactionStatus status,
            List<TransactionDisplayStatus> displayStatuses,
            Boolean privatelyPaid,
            Boolean detached,
            List<String> categoryValues) {

        Long orgId = organizationContext.getCurrentOrganizationId();

        // Same filters as findFiltered/countFiltered, but with the "t." alias so it can drive an aggregate SELECT.
        StringBuilder where = new StringBuilder("t.organization.id = :orgId");
        Map<String, Object> params = new HashMap<>();
        params.put("orgId", orgId);

        if (search != null && !search.isBlank()) {
            where.append(" and (LOWER(t.name) LIKE :search"
                    + " OR t.sender.id IN (SELECT tp.id FROM TradeParty tp WHERE LOWER(tp.name) LIKE :search)"
                    + " OR t.recipient.id IN (SELECT tp.id FROM TradeParty tp WHERE LOWER(tp.name) LIKE :search)");
            params.put("search", "%" + search.toLowerCase() + "%");
            BigDecimal searchAmount = parseSearchAmount(search);
            if (searchAmount != null) {
                where.append(" OR abs(t.total) = :searchAmount");
                params.put("searchAmount", searchAmount.abs());
            }
            where.append(")");
        }

        if (startDate != null) {
            where.append(" and t.transactionTime >= :startDate");
            params.put("startDate", startDate);
        }
        if (endDate != null) {
            where.append(" and t.transactionTime <= :endDate");
            params.put("endDate", endDate);
        }
        if (detached != null && detached) {
            where.append(" and t.bommel is null");
        } else if (bommelIds != null && !bommelIds.isEmpty()) {
            where.append(" and t.bommel.id in :bommelIds");
            params.put("bommelIds", bommelIds);
        }
        if (status != null) {
            where.append(" and t.status = :status");
            params.put("status", status);
        }
        appendDisplayStatusFilter(where, params, displayStatuses, "t.");
        if (privatelyPaid != null) {
            where.append(" and t.privatelyPaid = :privatelyPaid");
            params.put("privatelyPaid", privatelyPaid);
        }

        appendCategoryFilters(where, params, categoryValues, "t.");

        var query = getEntityManager().createQuery(
                "SELECT COALESCE(SUM(CASE WHEN t.total > 0 THEN t.total ELSE 0 END), 0), "
                        + "COALESCE(SUM(CASE WHEN t.total < 0 THEN -t.total ELSE 0 END), 0) "
                        + "FROM Transaction t WHERE " + where,
                Object[].class);
        params.forEach(query::setParameter);
        Object[] row = query.getSingleResult();
        return new BigDecimal[] { (BigDecimal) row[0], (BigDecimal) row[1] };
    }
}
