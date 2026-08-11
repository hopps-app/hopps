package app.hopps.organization.repository;

import app.hopps.document.domain.ExtractionSource;
import app.hopps.organization.api.dto.DailyActivity;
import app.hopps.organization.api.dto.DailyCount;
import app.hopps.organization.api.dto.MonthlyCount;
import app.hopps.organization.api.dto.MonthlyExtraction;
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
import java.util.LinkedHashMap;
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

    /**
     * Reporting window for the per-day activity chart, in days (inclusive of today). Independent of how long the
     * underlying rows are retained ({@code MemberActivityRepository.RETENTION_DAYS}) — this is just how much of that
     * history the organization detail page shows.
     */
    public static final int ACTIVITY_WINDOW_DAYS = 7;

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
     * Time spent in the application per day for one organization over the inclusive {@code [from, to]} range, in
     * seconds, summed across the organization's members (each member's per-day {@code active_seconds}). Because it sums
     * across members, an organization with several concurrently active members can exceed 24 hours in a day — this is
     * combined member time, not wall-clock time the organization was "open". Every day in the range is returned (days
     * with no activity as 0) via {@code generate_series}, so the result is gap-free and chart-ready.
     */
    @SuppressWarnings("unchecked")
    public List<DailyActivity> dailyActiveSecondsForOrganization(long organizationId, LocalDate from, LocalDate to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                "select d::date as day, coalesce(sum(a.active_seconds), 0) as active_seconds "
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

    /**
     * Number of organizations that registered per month over the inclusive {@code [from, to]} range, where
     * {@code from}/{@code to} are month-start dates. Every month is returned (months with no signups as 0) via
     * {@code generate_series}, so the result is gap-free and chart-ready. Soft-deleted organizations are excluded, so
     * this is "how many of today's Vereine joined in month X" rather than a historical record of signups.
     */
    @SuppressWarnings("unchecked")
    public List<MonthlyCount> monthlySignupCounts(LocalDate from, LocalDate to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                "select m::date as month, count(o.id) as signup_count "
                        + "from generate_series(:from, :to, interval '1 month') m "
                        + "left join organization o "
                        + "  on date_trunc('month', o.created_at)::date = m::date "
                        + " and o.deleted_at is null "
                        + "group by m order by m")
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();

        return rows.stream()
                .map(row -> new MonthlyCount((LocalDate) row[0], ((Number) row[1]).longValue()))
                .toList();
    }

    /**
     * Time spent in the application per day across every active organization over the inclusive {@code [from, to]}
     * range, in seconds. The estate-wide counterpart of
     * {@link #dailyActiveSecondsForOrganization(long, LocalDate, LocalDate)}: because it sums every member of every
     * organization, a day routinely exceeds 24 hours — it is combined member time, not wall-clock time. Every day in
     * the range is returned (days with no activity as 0) via {@code generate_series}, so the result is gap-free and
     * chart-ready.
     */
    @SuppressWarnings("unchecked")
    public List<DailyActivity> dailyActiveSecondsForAll(LocalDate from, LocalDate to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                "select d::date as day, coalesce(sum(a.active_seconds), 0) as active_seconds "
                        + "from generate_series(:from, :to, interval '1 day') d "
                        + "left join member_activity_day a on a.activity_date = d::date "
                        + "and a.member_id in ("
                        + "    select mv.member_id from member_verein mv "
                        + "    join organization o on o.id = mv.organizations_id and o.deleted_at is null) "
                        + "group by d order by d")
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();

        return rows.stream()
                .map(row -> new DailyActivity((LocalDate) row[0], ((Number) row[1]).longValue()))
                .toList();
    }

    /**
     * How many distinct organizations had at least one member active on each day of the inclusive {@code [from, to]}
     * range. "Active" here means "did something that day" — a stricter reading than the organizations table's
     * active/dormant badge, which asks only whether the organization has been seen within the last 90 days. Every day
     * in the range is returned via {@code generate_series}, days with nobody active as 0.
     */
    @SuppressWarnings("unchecked")
    public List<DailyCount> activeOrganizationsPerDay(LocalDate from, LocalDate to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                "select d::date as day, count(distinct o.id) as active_organizations "
                        + "from generate_series(:from, :to, interval '1 day') d "
                        + "left join member_activity_day a on a.activity_date = d::date and a.active_seconds > 0 "
                        + "left join member_verein mv on mv.member_id = a.member_id "
                        // Counting o.id rather than mv.organizations_id is what excludes soft-deleted organizations:
                        // the join yields null for them, and count(distinct) ignores nulls.
                        + "left join organization o on o.id = mv.organizations_id and o.deleted_at is null "
                        + "group by d order by d")
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();

        return rows.stream()
                .map(row -> new DailyCount((LocalDate) row[0], ((Number) row[1]).longValue()))
                .toList();
    }

    /**
     * How many distinct organizations were active at least once anywhere in the inclusive {@code [from, to]} range.
     * <p>
     * Deliberately not derivable from {@link #activeOrganizationsPerDay(LocalDate, LocalDate)}: summing those daily
     * counts would count an organization once per day it appeared, and taking their maximum would only find the busiest
     * single day. Distinct-over-the-window is its own question and needs its own query.
     */
    public long activeOrganizationsInWindow(LocalDate from, LocalDate to) {
        return ((Number) entityManager.createNativeQuery(
                "select count(distinct o.id) "
                        + "from member_activity_day a "
                        + "join member_verein mv on mv.member_id = a.member_id "
                        + "join organization o on o.id = mv.organizations_id and o.deleted_at is null "
                        + "where a.activity_date between :from and :to and a.active_seconds > 0")
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult()).longValue();
    }

    /**
     * Documents uploaded per month, split by {@link ExtractionSource}, across every active organization, over the
     * inclusive {@code [from, to]} range of month-start dates. Every month in the range is present via
     * {@code generate_series}, and every month carries an entry for all three sources (missing ones as 0), so the
     * result is a gap-free, chart-ready set of parallel series.
     * <p>
     * Documents whose {@code extractionsource} is null are folded into {@link ExtractionSource#MANUAL}, matching
     * {@link #extractionBreakdownForOrganization(long)}. Uploads are bucketed by the month of
     * {@code document.createdat}.
     */
    @SuppressWarnings("unchecked")
    public List<MonthlyExtraction> monthlyExtractionCounts(LocalDate from, LocalDate to) {
        List<Object[]> rows = entityManager.createNativeQuery(
                "select m::date as month, coalesce(d.extractionsource, 'MANUAL') as source, count(d.id) as cnt "
                        + "from generate_series(:from, :to, interval '1 month') m "
                        + "left join document d "
                        + "  on date_trunc('month', d.createdat)::date = m::date "
                        + " and d.organization_id in (select o.id from organization o where o.deleted_at is null) "
                        + "group by m, coalesce(d.extractionsource, 'MANUAL') "
                        + "order by m")
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();

        // A month with no uploads at all still produces one row (the left join's null source coalesces to MANUAL) with
        // a count of zero, so every month in the range appears here even before the sources are filled in.
        Map<LocalDate, Map<ExtractionSource, Long>> byMonth = new LinkedHashMap<>();
        for (Object[] row : rows) {
            LocalDate month = (LocalDate) row[0];
            Map<ExtractionSource, Long> counts = byMonth.computeIfAbsent(month,
                    m -> new EnumMap<>(ExtractionSource.class));
            long count = ((Number) row[2]).longValue();
            if (count > 0) {
                counts.merge(ExtractionSource.valueOf((String) row[1]), count, Long::sum);
            }
        }

        return byMonth.entrySet()
                .stream()
                .map(e -> {
                    Map<ExtractionSource, Long> counts = new EnumMap<>(ExtractionSource.class);
                    // Fill every source so each series has a value at every month rather than a hole in the line.
                    for (ExtractionSource source : ExtractionSource.values()) {
                        counts.put(source, e.getValue().getOrDefault(source, 0L));
                    }
                    return new MonthlyExtraction(e.getKey(), counts);
                })
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
