package app.hopps.org.jpa;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class CategoryRepository implements PanacheRepository<Category> {

    public List<Category> findByOrganization(Organization organization) {
        return find("organization", organization).list();
    }

    public List<Category> findByOrganizationId(Long organizationId) {
        return find("organization.id", organizationId).list();
    }

    public List<Category> findByNameAndOrganization(String name, Organization organization) {
        return find("name = ?1 and organization = ?2", name, organization).list();
    }

    public Category findByNameAndOrganizationIgnoreCase(String name, Organization organization) {
        return find("LOWER(name) = LOWER(?1) and organization = ?2", name, organization).firstResult();
    }
}
