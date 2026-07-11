package app.hopps.organization.repository;

import app.hopps.organization.api.dto.DailyActivity;
import app.hopps.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Read-side queries backing the admin organization API. Kept separate from {@link OrganizationRepository} because these
 * are admin-only aggregate reads (counts, activity) rather than the operational organization lookups. All queries
 * respect the {@code @SQLRestriction} on {@link Organization}, so soft-deleted organizations are never returned.
 */
@ApplicationScoped
public class AdminOrganizationRepository implements PanacheRepository<Organization> {

    @Inject
    EntityManager entityManager;

    /**
     * Returns all active (non-soft-deleted) organizations, newest first.
     */
    public List<Organization> listByCreatedAt() {
        return listAll(Sort.by("createdAt").descending().and("id", Sort.Direction.Descending));
    }

    /**
     * Transaction (Beleg) counts grouped by organization id, for the given organization ids. Organizations with no
     * transactions are simply absent from the map (callers should default to 0).
     */
    public Map<Long, Long> belegeCountByOrganization(Collection<Long> organizationIds) {
        if (organizationIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                "select t.organization.id, count(t) from Transaction t "
                        + "where t.organization.id in :ids group by t.organization.id",
                Object[].class)
                .setParameter("ids", organizationIds)
                .getResultList();
        return toLongMap(rows);
    }

    /**
     * Most recent {@code lastSeenAt} across each organization's members, grouped by organization id. Organizations
     * whose members have never been seen are absent from the map (callers should default to null).
     */
    public Map<Long, Instant> lastActivityByOrganization(Collection<Long> organizationIds) {
        if (organizationIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                "select o.id, max(m.lastSeenAt) from Organization o join o.members m "
                        + "where o.id in :ids group by o.id",
                Object[].class)
                .setParameter("ids", organizationIds)
                .getResultList();
        Map<Long, Instant> result = new HashMap<>();
        for (Object[] row : rows) {
            if (row[1] != null) {
                result.put((Long) row[0], (Instant) row[1]);
            }
        }
        return result;
    }

    /**
     * Number of transactions (Belege) for a single organization.
     */
    public long belegeCount(Long organizationId) {
        return entityManager.createQuery(
                "select count(t) from Transaction t where t.organization.id = :id", Long.class)
                .setParameter("id", organizationId)
                .getSingleResult();
    }

    /**
     * Number of bank statement imports for a single organization.
     */
    public long bankImportCount(Long organizationId) {
        return entityManager.createQuery(
                "select count(b) from BankImport b where b.organization.id = :id", Long.class)
                .setParameter("id", organizationId)
                .getSingleResult();
    }

    /**
     * Distinct active member count per day for one organization over the inclusive {@code [from, to]} range. Every day
     * in the range is returned (days with no activity as 0) via {@code generate_series}, so the result is gap-free and
     * chart-ready.
     */
    @SuppressWarnings("unchecked")
    public List<DailyActivity> dailyActiveCountsForOrganization(long organizationId, LocalDate from, LocalDate to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                "select d::date as day, count(distinct a.member_id) as active_users "
                        + "from generate_series(:from, :to, interval '1 day') d "
                        + "left join member_activity_day a on a.activity_date = d::date "
                        + "and a.member_id in (select member_id from member_verein where organizations_id = :orgId) "
                        + "group by d order by d")
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("orgId", organizationId)
                .getResultList();

        return rows.stream()
                .map(row -> new DailyActivity((LocalDate) row[0], ((Number) row[1]).longValue()))
                .toList();
    }

    private static Map<Long, Long> toLongMap(List<Object[]> rows) {
        Map<Long, Long> result = new HashMap<>();
        for (Object[] row : rows) {
            result.put((Long) row[0], (Long) row[1]);
        }
        return result;
    }
}
