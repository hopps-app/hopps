package app.hopps.organization.repository;

import app.hopps.document.domain.ExtractionSource;
import app.hopps.organization.api.dto.DailyActivity;
import app.hopps.organization.api.dto.MonthlyCount;
import app.hopps.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.EnumMap;
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

    /** Reporting window for the document-upload activity chart, in months (inclusive of the current month). */
    public static final int WINDOW_MONTHS = 6;

    @Inject
    EntityManager entityManager;

    /**
     * Returns all active (non-soft-deleted) organizations, newest first.
     */
    public List<Organization> listByCreatedAt() {
        return listAll(Sort.by("createdAt").descending().and("id", Sort.Direction.Descending));
    }

    /**
     * Uploaded document (Beleg) counts grouped by organization id, for the given organization ids. Organizations with
     * no documents are simply absent from the map (callers should default to 0).
     */
    public Map<Long, Long> belegeCountByOrganization(Collection<Long> organizationIds) {
        if (organizationIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows = entityManager.createQuery(
                "select d.organization.id, count(d) from Document d "
                        + "where d.organization.id in :ids group by d.organization.id",
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
     * Number of uploaded documents (Belege) for a single organization.
     */
    public long documentCount(Long organizationId) {
        return entityManager.createQuery(
                "select count(d) from Document d where d.organization.id = :id", Long.class)
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
     * Total activity events per day for one organization over the inclusive {@code [from, to]} range, summed across the
     * organization's members (each member's per-day {@code activity_count}). Every day in the range is returned (days
     * with no activity as 0) via {@code generate_series}, so the result is gap-free and chart-ready.
     */
    @SuppressWarnings("unchecked")
    public List<DailyActivity> dailyActivityCountsForOrganization(long organizationId, LocalDate from, LocalDate to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                "select d::date as day, coalesce(sum(a.activity_count), 0) as activity_count "
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

    /**
     * Number of uploaded documents (Belege) per month for one organization over the inclusive {@code [from, to]} range,
     * where {@code from}/{@code to} are month-start dates. Every month in the range is returned (months with no uploads
     * as 0) via {@code generate_series}, so the result is gap-free and chart-ready. Uploads are bucketed by the month
     * of {@code document.createdat}.
     */
    @SuppressWarnings("unchecked")
    public List<MonthlyCount> monthlyUploadCountsForOrganization(long organizationId, LocalDate from, LocalDate to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                "select m::date as month, count(d.id) as upload_count "
                        + "from generate_series(:from, :to, interval '1 month') m "
                        + "left join document d "
                        + "  on date_trunc('month', d.createdat)::date = m::date "
                        + " and d.organization_id = :orgId "
                        + "group by m order by m")
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("orgId", organizationId)
                .getResultList();

        return rows.stream()
                .map(row -> new MonthlyCount((LocalDate) row[0], ((Number) row[1]).longValue()))
                .toList();
    }

    /**
     * All-time count of one organization's documents (Belege) grouped by {@link ExtractionSource}. Not windowed. A
     * document whose {@code extractionSource} is {@code null} (never analyzed and never edited) is folded into
     * {@link ExtractionSource#MANUAL} and merged with any explicitly-manual documents, so every document is attributed
     * to exactly one source. Sources with no documents are simply absent from the map (callers should treat them as 0).
     */
    public Map<ExtractionSource, Long> extractionBreakdownForOrganization(long organizationId) {
        List<Object[]> rows = entityManager.createQuery(
                "select d.extractionSource, count(d) from Document d "
                        + "where d.organization.id = :id group by d.extractionSource",
                Object[].class)
                .setParameter("id", organizationId)
                .getResultList();
        Map<ExtractionSource, Long> result = new EnumMap<>(ExtractionSource.class);
        for (Object[] row : rows) {
            ExtractionSource source = row[0] != null ? (ExtractionSource) row[0] : ExtractionSource.MANUAL;
            result.merge(source, (Long) row[1], Long::sum);
        }
        return result;
    }

    private static Map<Long, Long> toLongMap(List<Object[]> rows) {
        Map<Long, Long> result = new HashMap<>();
        for (Object[] row : rows) {
            result.put((Long) row[0], (Long) row[1]);
        }
        return result;
    }
}
