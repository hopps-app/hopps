package app.hopps.category.repository;

import app.hopps.category.domain.CategoryGroupValue;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@ApplicationScoped
public class CategoryGroupValueRepository implements PanacheRepository<CategoryGroupValue> {

    private static final Sort ORDER = Sort.by("sortIndex").and("value");

    /**
     * Paginated, optionally filtered values of a single group. {@code query} is a case-insensitive substring match;
     * null/blank returns all values (still paginated). Callers must have verified the group belongs to the current org.
     */
    public List<CategoryGroupValue> search(Long groupId, String query, Page page) {
        if (query == null || query.isBlank()) {
            return find("categoryGroup.id = ?1", ORDER, groupId).page(page).list();
        }
        String like = "%" + query.toLowerCase(Locale.ROOT) + "%";
        return find("categoryGroup.id = ?1 and lower(value) like ?2", ORDER, groupId, like).page(page).list();
    }

    public long countSearch(Long groupId, String query) {
        if (query == null || query.isBlank()) {
            return count("categoryGroup.id = ?1", groupId);
        }
        String like = "%" + query.toLowerCase(Locale.ROOT) + "%";
        return count("categoryGroup.id = ?1 and lower(value) like ?2", groupId, like);
    }

    public boolean existsValue(Long groupId, String value) {
        return count("categoryGroup.id = ?1 and value = ?2", groupId, value) > 0;
    }

    /** The subset of the given values that already exist in the group (batch existence check). */
    public Set<String> existingValues(Long groupId, Collection<String> values) {
        if (values == null || values.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(getEntityManager()
                .createQuery("select v.value from CategoryGroupValue v "
                        + "where v.categoryGroup.id = :groupId and v.value in :values", String.class)
                .setParameter("groupId", groupId)
                .setParameter("values", values)
                .getResultList());
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
