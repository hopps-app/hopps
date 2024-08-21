package app.hopps.vereine.jpa;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class VereinRepository implements PanacheRepository<Verein> {

    public Verein findBySlug(String slug) {
        return find("slug", slug).firstResult();
    }
}
