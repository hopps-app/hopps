package app.hopps.category.repository;

import app.hopps.category.domain.CategoryGroupValue;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@ApplicationScoped
public class CategoryGroupValueRepository implements PanacheRepository<CategoryGroupValue> {

    // Parents have to be left-joined: a path like v.parent.value would drop every top-level value.
    private static final String FROM = " from CategoryGroupValue v left join v.parent p where v.categoryGroup.id = :groupId";

    /** Tree order: each top-level value directly followed by its children. */
    private static final String TREE_ORDER = " order by coalesce(p.sortIndex, v.sortIndex), coalesce(p.value, v.value),"
            + " case when p.id is null then 0 else 1 end, v.sortIndex, v.value";

    private static final String SELECTABLE = "v.bookable = true and v.hidden = false and (p.id is null or p.hidden = false)";

    /**
     * Paginated, optionally filtered values of a single group, in tree order. {@code query} is a case-insensitive
     * substring match on the value or its parent; null/blank returns all values (still paginated). Callers must have
     * verified the group belongs to the current org.
     *
     * @param forSelection
     *            leave out hidden values, as the value picker for new bookings does. Parents that cannot be booked stay
     *            in, they structure the list.
     * @param topLevelOnly
     *            only values without a parent, the candidates for a parent
     */
    public List<CategoryGroupValue> search(Long groupId, String query, boolean forSelection, boolean topLevelOnly,
            Page page) {
        var find = getEntityManager()
                .createQuery("select v from CategoryGroupValue v left join fetch v.parent p "
                        + "where v.categoryGroup.id = :groupId" + filter(query, forSelection, topLevelOnly)
                        + TREE_ORDER,
                        CategoryGroupValue.class)
                .setParameter("groupId", groupId);
        if (query != null && !query.isBlank()) {
            find.setParameter("like", like(query));
        }
        return find.setFirstResult(page.index * page.size).setMaxResults(page.size).getResultList();
    }

    public long countSearch(Long groupId, String query, boolean forSelection, boolean topLevelOnly) {
        var count = getEntityManager()
                .createQuery("select count(v)" + FROM + filter(query, forSelection, topLevelOnly), Long.class)
                .setParameter("groupId", groupId);
        if (query != null && !query.isBlank()) {
            count.setParameter("like", like(query));
        }
        return count.getSingleResult();
    }

    private static String filter(String query, boolean forSelection, boolean topLevelOnly) {
        StringBuilder where = new StringBuilder();
        if (query != null && !query.isBlank()) {
            where.append(" and (lower(v.value) like :like or lower(p.value) like :like)");
        }
        if (forSelection) {
            where.append(" and v.hidden = false and (p.id is null or p.hidden = false)");
        }
        if (topLevelOnly) {
            where.append(" and p.id is null");
        }
        return where.toString();
    }

    private static String like(String query) {
        return "%" + query.toLowerCase(Locale.ROOT) + "%";
    }

    /** All values of a group in tree order, without paging. For the export. */
    public List<CategoryGroupValue> allInTreeOrder(Long groupId) {
        return getEntityManager()
                .createQuery("select v from CategoryGroupValue v left join fetch v.parent p "
                        + "where v.categoryGroup.id = :groupId" + TREE_ORDER, CategoryGroupValue.class)
                .setParameter("groupId", groupId)
                .getResultList();
    }

    /** Whether a new booking can use this value: it exists, can be booked and is not hidden, also not by its parent. */
    public boolean isSelectable(Long groupId, String value) {
        return getEntityManager()
                .createQuery("select count(v)" + FROM + " and v.value = :value and " + SELECTABLE, Long.class)
                .setParameter("groupId", groupId)
                .setParameter("value", value)
                .getSingleResult() > 0;
    }

    /** How many values of the group a new booking can use. */
    public long countSelectable(Long groupId) {
        return getEntityManager()
                .createQuery("select count(v)" + FROM + " and " + SELECTABLE, Long.class)
                .setParameter("groupId", groupId)
                .getSingleResult();
    }

    /** Child count per value, for the values that have children. */
    public Map<Long, Long> childCounts(Collection<Long> valueIds) {
        if (valueIds == null || valueIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : getEntityManager()
                .createQuery("select v.parent.id, count(v) from CategoryGroupValue v "
                        + "where v.parent.id in :ids group by v.parent.id", Object[].class)
                .setParameter("ids", valueIds)
                .getResultList()) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
    }

    /** The children of a value, by name. Empty for a value without children or one that does not exist. */
    public List<String> childValues(Long groupId, String parentValue) {
        return getEntityManager()
                .createQuery("select v.value from CategoryGroupValue v join v.parent p "
                        + "where v.categoryGroup.id = :groupId and p.value = :parentValue", String.class)
                .setParameter("groupId", groupId)
                .setParameter("parentValue", parentValue)
                .getResultList();
    }

    /** The parent of every child value of a group, as {@code child → parent}. */
    public Map<String, String> parentsByValue(Long groupId) {
        Map<String, String> parents = new HashMap<>();
        for (Object[] row : getEntityManager()
                .createQuery("select v.value, p.value from CategoryGroupValue v join v.parent p "
                        + "where v.categoryGroup.id = :groupId", Object[].class)
                .setParameter("groupId", groupId)
                .getResultList()) {
            parents.put((String) row[0], (String) row[1]);
        }
        return parents;
    }

    public int maxSortIndex(Long groupId) {
        Integer max = getEntityManager()
                .createQuery("select max(v.sortIndex) from CategoryGroupValue v where v.categoryGroup.id = :groupId",
                        Integer.class)
                .setParameter("groupId", groupId)
                .getSingleResult();
        return max == null ? -1 : max;
    }
}
