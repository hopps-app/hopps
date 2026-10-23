package app.hopps.template.repository;

import app.hopps.template.domain.CategoryGroupTemplate;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class CategoryGroupTemplateRepository implements PanacheRepository<CategoryGroupTemplate> {

    /** Every category group template, in the order admins arranged them. */
    public List<CategoryGroupTemplate> listOrdered() {
        return find("order by sortIndex, name").list();
    }

    /** The templates organizations may pick from. */
    public List<CategoryGroupTemplate> listActive() {
        return find("active = true order by sortIndex, name").list();
    }

    /** The value count per template in one grouped query. Templates without values are absent from the map. */
    public Map<Long, Long> valueCounts(Collection<Long> templateIds) {
        Map<Long, Long> counts = new HashMap<>();
        if (templateIds == null || templateIds.isEmpty()) {
            return counts;
        }
        List<Object[]> rows = getEntityManager()
                .createQuery("select v.template.id, count(v) from TemplateCategoryValue v "
                        + "where v.template.id in :ids group by v.template.id", Object[].class)
                .setParameter("ids", templateIds)
                .getResultList();
        for (Object[] row : rows) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
    }

    /** The first {@code limit} values of a template, in order. Used as a preview without loading the whole list. */
    public List<String> firstValues(Long templateId, int limit) {
        return getEntityManager()
                .createQuery("select v.value from TemplateCategoryValue v where v.template.id = :id "
                        + "order by v.sortIndex", String.class)
                .setParameter("id", templateId)
                .setMaxResults(limit)
                .getResultList();
    }

    /**
     * How many organizations currently hold a category group copied from each template. Templates nobody uses are
     * absent from the map.
     */
    public Map<Long, Long> usageCounts(Collection<Long> templateIds) {
        Map<Long, Long> counts = new HashMap<>();
        if (templateIds == null || templateIds.isEmpty()) {
            return counts;
        }
        List<Object[]> rows = getEntityManager()
                .createQuery("select g.templateId, count(distinct g.organization.id) from CategoryGroup g "
                        + "where g.templateId in :ids group by g.templateId", Object[].class)
                .setParameter("ids", templateIds)
                .getResultList();
        for (Object[] row : rows) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
    }
}
