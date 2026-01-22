package app.fuggs.organization.repository;

import app.fuggs.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class OrganizationRepository implements PanacheRepository<Organization>
{
	public Organization findBySlug(String slug)
	{
		return find("slug", slug).firstResult();
	}

	public Organization findByName(String name)
	{
		return find("name", name).firstResult();
	}
}
