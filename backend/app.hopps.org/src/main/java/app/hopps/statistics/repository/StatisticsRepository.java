package app.hopps.statistics.repository;

import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@ApplicationScoped
public class StatisticsRepository implements PanacheRepository<Transaction> {

    /**
     * Sum total amounts for all transactions in an organization.
     *
     * @param organizationId
     *            the organization ID
     * @param includeDrafts
     *            whether to include draft transactions
     *
     * @return sum of totals, or ZERO if none found
     */
    public BigDecimal sumTotal(long organizationId, boolean includeDrafts) {
        StringBuilder query = new StringBuilder("SELECT COALESCE(SUM(t.total), 0) FROM Transaction t " +
                "WHERE t.organization.id = :orgId AND t.total IS NOT NULL");

        Map<String, Object> params = new HashMap<>();
        params.put("orgId", organizationId);

        if (!includeDrafts) {
            query.append(" AND t.status = :status");
            params.put("status", TransactionStatus.CONFIRMED);
        }

        var typedQuery = getEntityManager().createQuery(query.toString(), BigDecimal.class);
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            typedQuery.setParameter(entry.getKey(), entry.getValue());
        }

        return typedQuery.getSingleResult();
    }

    /**
     * Sum total amounts for transactions of a specific bommel.
     *
     * @param bommelId
     *            the bommel ID
     * @param includeDrafts
     *            whether to include draft transactions
     *
     * @return sum of totals, or ZERO if none found
     */
    public BigDecimal sumTotalByBommel(long bommelId, boolean includeDrafts) {
        StringBuilder query = new StringBuilder("SELECT COALESCE(SUM(t.total), 0) FROM Transaction t " +
                "WHERE t.bommel.id = :bommelId AND t.total IS NOT NULL");

        Map<String, Object> params = new HashMap<>();
        params.put("bommelId", bommelId);

        if (!includeDrafts) {
            query.append(" AND t.status = :status");
            params.put("status", TransactionStatus.CONFIRMED);
        }

        var typedQuery = getEntityManager().createQuery(query.toString(), BigDecimal.class);
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            typedQuery.setParameter(entry.getKey(), entry.getValue());
        }

        return typedQuery.getSingleResult();
    }

    /**
     * Count transactions in an organization.
     *
     * @param organizationId
     *            the organization ID
     * @param includeDrafts
     *            whether to include draft transactions
     *
     * @return count of transactions
     */
    public int countTransactions(long organizationId, boolean includeDrafts) {
        StringBuilder query = new StringBuilder("SELECT COUNT(t) FROM Transaction t " +
                "WHERE t.organization.id = :orgId");

        Map<String, Object> params = new HashMap<>();
        params.put("orgId", organizationId);

        if (!includeDrafts) {
            query.append(" AND t.status = :status");
            params.put("status", TransactionStatus.CONFIRMED);
        }

        var typedQuery = getEntityManager().createQuery(query.toString(), Long.class);
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            typedQuery.setParameter(entry.getKey(), entry.getValue());
        }

        return typedQuery.getSingleResult().intValue();
    }

    /**
     * Count transactions for a specific bommel.
     *
     * @param bommelId
     *            the bommel ID
     * @param includeDrafts
     *            whether to include draft transactions
     *
     * @return count of transactions
     */
    public int countTransactionsByBommel(long bommelId, boolean includeDrafts) {
        StringBuilder query = new StringBuilder("SELECT COUNT(t) FROM Transaction t " +
                "WHERE t.bommel.id = :bommelId");

        Map<String, Object> params = new HashMap<>();
        params.put("bommelId", bommelId);

        if (!includeDrafts) {
            query.append(" AND t.status = :status");
            params.put("status", TransactionStatus.CONFIRMED);
        }

        var typedQuery = getEntityManager().createQuery(query.toString(), Long.class);
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            typedQuery.setParameter(entry.getKey(), entry.getValue());
        }

        return typedQuery.getSingleResult().intValue();
    }

    /**
     * Sum income (positive transactions) for an organization.
     *
     * @param organizationId
     *            the organization ID
     * @param includeDrafts
     *            whether to include draft transactions
     *
     * @return sum of positive totals, or ZERO if none found
     */
    public BigDecimal sumIncome(long organizationId, boolean includeDrafts) {
        StringBuilder query = new StringBuilder("SELECT COALESCE(SUM(t.total), 0) FROM Transaction t " +
                "WHERE t.organization.id = :orgId AND t.total IS NOT NULL AND t.total > 0");

        Map<String, Object> params = new HashMap<>();
        params.put("orgId", organizationId);

        if (!includeDrafts) {
            query.append(" AND t.status = :status");
            params.put("status", TransactionStatus.CONFIRMED);
        }

        var typedQuery = getEntityManager().createQuery(query.toString(), BigDecimal.class);
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            typedQuery.setParameter(entry.getKey(), entry.getValue());
        }

        return typedQuery.getSingleResult();
    }

    /**
     * Sum expenses (negative transactions) for an organization.
     *
     * @param organizationId
     *            the organization ID
     * @param includeDrafts
     *            whether to include draft transactions
     *
     * @return sum of negative totals (as positive value), or ZERO if none found
     */
    public BigDecimal sumExpenses(long organizationId, boolean includeDrafts) {
        StringBuilder query = new StringBuilder("SELECT COALESCE(SUM(ABS(t.total)), 0) FROM Transaction t " +
                "WHERE t.organization.id = :orgId AND t.total IS NOT NULL AND t.total < 0");

        Map<String, Object> params = new HashMap<>();
        params.put("orgId", organizationId);

        if (!includeDrafts) {
            query.append(" AND t.status = :status");
            params.put("status", TransactionStatus.CONFIRMED);
        }

        var typedQuery = getEntityManager().createQuery(query.toString(), BigDecimal.class);
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            typedQuery.setParameter(entry.getKey(), entry.getValue());
        }

        return typedQuery.getSingleResult();
    }

    /**
     * Sum income (positive transactions) for a specific bommel.
     *
     * @param bommelId
     *            the bommel ID
     * @param includeDrafts
     *            whether to include draft transactions
     *
     * @return sum of positive totals, or ZERO if none found
     */
    public BigDecimal sumIncomeByBommel(long bommelId, boolean includeDrafts) {
        StringBuilder query = new StringBuilder("SELECT COALESCE(SUM(t.total), 0) FROM Transaction t " +
                "WHERE t.bommel.id = :bommelId AND t.total IS NOT NULL AND t.total > 0");

        Map<String, Object> params = new HashMap<>();
        params.put("bommelId", bommelId);

        if (!includeDrafts) {
            query.append(" AND t.status = :status");
            params.put("status", TransactionStatus.CONFIRMED);
        }

        var typedQuery = getEntityManager().createQuery(query.toString(), BigDecimal.class);
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            typedQuery.setParameter(entry.getKey(), entry.getValue());
        }

        return typedQuery.getSingleResult();
    }

    /**
     * Sum expenses (negative transactions) for a specific bommel.
     *
     * @param bommelId
     *            the bommel ID
     * @param includeDrafts
     *            whether to include draft transactions
     *
     * @return sum of negative totals (as positive value), or ZERO if none found
     */
    public BigDecimal sumExpensesByBommel(long bommelId, boolean includeDrafts) {
        StringBuilder query = new StringBuilder("SELECT COALESCE(SUM(ABS(t.total)), 0) FROM Transaction t " +
                "WHERE t.bommel.id = :bommelId AND t.total IS NOT NULL AND t.total < 0");

        Map<String, Object> params = new HashMap<>();
        params.put("bommelId", bommelId);

        if (!includeDrafts) {
            query.append(" AND t.status = :status");
            params.put("status", TransactionStatus.CONFIRMED);
        }

        var typedQuery = getEntityManager().createQuery(query.toString(), BigDecimal.class);
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            typedQuery.setParameter(entry.getKey(), entry.getValue());
        }

        return typedQuery.getSingleResult();
    }
}
