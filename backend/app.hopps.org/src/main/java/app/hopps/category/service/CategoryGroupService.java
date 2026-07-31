package app.hopps.category.service;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.domain.TreeSearchBommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.category.domain.CategoryGroup;
import app.hopps.category.repository.CategoryGroupRepository;
import app.hopps.category.repository.CategoryGroupValueRepository;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionCategoryValue;
import app.hopps.transaction.domain.TransactionStatus;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.BadRequestException;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Applicability, validation and the mandatory-group logic for category groups.
 * <p>
 * A group applies to a transaction's bommel B when at least one bommel assigned to the group is B or an ancestor of B.
 * Value validity is enforced on every save (an invalid value → 400); mandatory groups are enforced at confirm time (via
 * the transaction confirm blockers).
 */
@ApplicationScoped
public class CategoryGroupService {

    @Inject
    CategoryGroupRepository categoryGroupRepository;

    @Inject
    CategoryGroupValueRepository categoryGroupValueRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    EntityManager entityManager;

    /**
     * The groups that apply to the given bommel: those assigned to the bommel itself or to any of its ancestors. A null
     * bommel has no applicable groups (an empty assignment set means "no bommel").
     */
    public List<CategoryGroup> applicableGroups(Bommel bommel) {
        if (bommel == null) {
            return List.of();
        }
        Set<Long> ids = new HashSet<>();
        ids.add(bommel.id);
        for (TreeSearchBommel ancestor : bommelRepository.getParents(bommel)) {
            ids.add(ancestor.bommel().id);
        }
        return categoryGroupRepository.findApplicable(ids);
    }

    /**
     * Validates the provided (groupId → value) entries against the transaction's applicable groups and stores them.
     * Entries for non-applicable groups are discarded; an entry whose value is not one of its group's allowed values
     * makes the whole request fail with 400. Passing null leaves the existing values untouched; an empty map clears
     * them.
     */
    public void validateAndApply(Transaction transaction, Map<Long, String> categoryValues) {
        if (categoryValues == null) {
            return;
        }

        Map<Long, CategoryGroup> applicable = applicableGroups(transaction.getBommel()).stream()
                .collect(Collectors.toMap(CategoryGroup::getId, g -> g));

        Map<Long, String> accepted = new java.util.HashMap<>();
        List<String> invalid = new ArrayList<>();
        for (Map.Entry<Long, String> entry : categoryValues.entrySet()) {
            Long groupId = entry.getKey();
            String value = entry.getValue();
            CategoryGroup group = applicable.get(groupId);
            if (group == null) {
                // not applicable to this transaction's bommel — silently discard
                continue;
            }
            if (value == null || value.isBlank()) {
                continue;
            }
            if (!categoryGroupValueRepository.existsValue(groupId, value)) {
                invalid.add(group.getName());
                continue;
            }
            accepted.put(groupId, value);
        }

        if (!invalid.isEmpty()) {
            throw new BadRequestException(
                    "Invalid category value(s) for group(s): " + String.join(", ", invalid));
        }

        transaction.replaceCategoryValues(accepted);
    }

    /**
     * Names of the applicable, required groups for which the transaction has no value yet. Empty means the transaction
     * satisfies every mandatory group and may be confirmed.
     */
    public List<String> missingRequiredGroups(Transaction transaction) {
        List<CategoryGroup> applicable = applicableGroups(transaction.getBommel());
        Set<Long> presentGroupIds = transaction.getCategoryValues()
                .stream()
                .filter(v -> v.getValue() != null && !v.getValue().isBlank())
                .map(TransactionCategoryValue::getCategoryGroupId)
                .collect(Collectors.toSet());

        List<String> missing = new ArrayList<>();
        for (CategoryGroup group : applicable) {
            if (group.isRequired() && !presentGroupIds.contains(group.getId())) {
                missing.add(group.getName());
            }
        }
        return missing;
    }

    /**
     * Ids of already-confirmed transactions that would violate a group's mandatory-ness for the given pending state:
     * transactions on the assigned bommels (or any of their descendants) that have no value for the group. Empty when
     * the pending state is not required. A null groupId (group being created) means "every confirmed transaction under
     * the bommels", since none can have a value yet.
     */
    public List<Long> affectedConfirmedTransactionIds(boolean pendingRequired, Collection<Long> assignedBommelIds,
            Long groupId) {
        if (!pendingRequired || assignedBommelIds == null || assignedBommelIds.isEmpty()) {
            return List.of();
        }
        Set<Long> bommelIds = bommelRepository.getSelfAndDescendantIds(assignedBommelIds);
        if (bommelIds.isEmpty()) {
            return List.of();
        }

        if (groupId == null) {
            return entityManager
                    .createQuery("select t.id from Transaction t "
                            + "where t.status = :status and t.bommel.id in :bommelIds", Long.class)
                    .setParameter("status", TransactionStatus.CONFIRMED)
                    .setParameter("bommelIds", bommelIds)
                    .getResultList();
        }

        return entityManager
                .createQuery("select t.id from Transaction t "
                        + "where t.status = :status and t.bommel.id in :bommelIds "
                        + "and not exists (select 1 from TransactionCategoryValue tcv "
                        + "where tcv.transaction = t and tcv.categoryGroupId = :groupId "
                        + "and tcv.value is not null and tcv.value <> '')", Long.class)
                .setParameter("status", TransactionStatus.CONFIRMED)
                .setParameter("bommelIds", bommelIds)
                .setParameter("groupId", groupId)
                .getResultList();
    }

    /**
     * Resets the given transactions to DRAFT (and mirrors any linked confirmed document back to ANALYZED) so a
     * now-mandatory category value can be added. Uses bulk updates; returns the number of transactions reopened.
     */
    public int reopenTransactions(Collection<Long> transactionIds) {
        if (transactionIds == null || transactionIds.isEmpty()) {
            return 0;
        }
        entityManager
                .createQuery("update Document d set d.documentStatus = :analyzed "
                        + "where d.documentStatus = :confirmed and d.id in "
                        + "(select t.document.id from Transaction t where t.id in :ids and t.document is not null)")
                .setParameter("analyzed", DocumentStatus.ANALYZED)
                .setParameter("confirmed", DocumentStatus.CONFIRMED)
                .setParameter("ids", transactionIds)
                .executeUpdate();
        return entityManager
                .createQuery("update Transaction t set t.status = :draft where t.id in :ids")
                .setParameter("draft", TransactionStatus.DRAFT)
                .setParameter("ids", transactionIds)
                .executeUpdate();
    }

    /** How many transactions (draft or confirmed) currently carry a value for this group. */
    public long countLinkedTransactions(Long groupId) {
        return entityManager
                .createQuery("select count(tcv) from TransactionCategoryValue tcv where tcv.categoryGroupId = :groupId",
                        Long.class)
                .setParameter("groupId", groupId)
                .getSingleResult();
    }

    /** Removes this group's value from every transaction that carries it. Returns the number of rows removed. */
    public int deleteLinkedValues(Long groupId) {
        return entityManager
                .createQuery("delete from TransactionCategoryValue tcv where tcv.categoryGroupId = :groupId")
                .setParameter("groupId", groupId)
                .executeUpdate();
    }

    /**
     * Aggregates transaction totals grouped by the recorded values of one category group, within an optional
     * transaction-date range. Each returned row is {@code [String value, BigDecimal income, BigDecimal expense,
     * Long count]}: income is the sum of positive transaction totals, expense the magnitude of negative totals (both
     * non-negative), count the number of transactions carrying that value. Rows are ordered by value. Scoping to the
     * organization is implicit — a group id is unique to its organization, so only that org's transactions carry it.
     *
     * @param startDate
     *            inclusive lower bound on the transaction time, or null for no lower bound
     * @param endDate
     *            exclusive upper bound on the transaction time (caller passes start-of-next-day), or null
     * @param bommelIds
     *            restrict to transactions on these bommels (OR); null/empty for no bommel restriction
     */
    public List<Object[]> valueSumsForReport(Long groupId, java.time.Instant startDate, java.time.Instant endDate,
            Collection<Long> bommelIds) {
        boolean hasBommels = bommelIds != null && !bommelIds.isEmpty();
        StringBuilder jpql = new StringBuilder(
                "select tcv.value, "
                        + "coalesce(sum(case when t.total > 0 then t.total else 0 end), 0), "
                        + "coalesce(sum(case when t.total < 0 then -t.total else 0 end), 0), "
                        + "count(t.id) "
                        + "from TransactionCategoryValue tcv join tcv.transaction t "
                        + "where tcv.categoryGroupId = :groupId "
                        + "and tcv.value is not null and tcv.value <> ''");
        if (startDate != null) {
            jpql.append(" and t.transactionTime >= :startDate");
        }
        if (endDate != null) {
            jpql.append(" and t.transactionTime <= :endDate");
        }
        if (hasBommels) {
            jpql.append(" and t.bommel.id in :bommelIds");
        }
        jpql.append(" group by tcv.value order by tcv.value");

        var query = entityManager.createQuery(jpql.toString(), Object[].class)
                .setParameter("groupId", groupId);
        if (startDate != null) {
            query.setParameter("startDate", startDate);
        }
        if (endDate != null) {
            query.setParameter("endDate", endDate);
        }
        if (hasBommels) {
            query.setParameter("bommelIds", bommelIds);
        }
        return query.getResultList();
    }
}
