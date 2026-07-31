package app.hopps.category.repository;

import app.hopps.category.domain.CategoryGroup;
import app.hopps.shared.security.OrganizationContext;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class CategoryGroupRepository implements PanacheRepository<CategoryGroup> {

    @Inject
    OrganizationContext organizationContext;

    public List<CategoryGroup> findAllForCurrentOrg() {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("organization.id = ?1", orgId).list();
    }

    public CategoryGroup findByIdScoped(Long id) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
    }

    /**
     * Groups that apply to a bommel, given the set of that bommel's id and all of its ancestor ids. A group applies
     * when at least one assigned bommel is in the set. Groups with no bommel assignment never match (empty assignment =
     * "no bommel"). Returns an empty list when the id set is empty.
     */
    public List<CategoryGroup> findApplicable(Collection<Long> bommelAndAncestorIds) {
        if (bommelAndAncestorIds == null || bommelAndAncestorIds.isEmpty()) {
            return List.of();
        }
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("select distinct g from CategoryGroup g join g.bommels b "
                + "where g.organization.id = ?1 and b.id in ?2", orgId, bommelAndAncestorIds).list();
    }

    /**
     * The value count per group in a single grouped query (avoids N+1 when building the lightweight list response).
     * Groups without values are absent from the map (callers should default to 0).
     */
    public Map<Long, Long> valueCountsByGroup(Collection<Long> groupIds) {
        Map<Long, Long> counts = new HashMap<>();
        if (groupIds == null || groupIds.isEmpty()) {
            return counts;
        }
        List<Object[]> rows = getEntityManager()
                .createQuery("select v.categoryGroup.id, count(v) from CategoryGroupValue v "
                        + "where v.categoryGroup.id in :ids group by v.categoryGroup.id", Object[].class)
                .setParameter("ids", groupIds)
                .getResultList();
        for (Object[] row : rows) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
    }
}
