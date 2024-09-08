package app.hopps.vereine.jpa;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class OrganizationRepository implements PanacheRepository<Organization> {

    public Organization findBySlug(String slug) {
        return find("slug", slug).firstResult();
    }
}
