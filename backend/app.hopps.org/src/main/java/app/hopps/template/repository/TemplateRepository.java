package app.hopps.template.repository;

import app.hopps.template.domain.Template;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

/** Access to templates of any type. Type-specific queries live in the per-type repositories. */
@ApplicationScoped
public class TemplateRepository implements PanacheRepository<Template> {

    /** The position after the last template, so a new template is appended to the list. */
    public int nextSortIndex() {
        Integer max = getEntityManager()
                .createQuery("select max(t.sortIndex) from Template t", Integer.class)
                .getSingleResult();
        return max == null ? 0 : max + 1;
    }
}
