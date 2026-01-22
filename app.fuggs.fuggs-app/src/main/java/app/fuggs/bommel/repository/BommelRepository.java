package app.fuggs.bommel.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import app.fuggs.bommel.domain.Bommel;
import app.fuggs.shared.security.OrganizationContext;

import java.util.List;

@ApplicationScoped
public class BommelRepository implements PanacheRepository<Bommel>
{
	@Inject
	OrganizationContext organizationContext;

	/**
	 * Finds the root bommel for the current organization.
	 *
	 * @return The root bommel, or null if not found or no organization context
	 */
	public Bommel findRoot()
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return null;
		}
		return find("parent is null and organization.id = ?1", orgId).firstResult();
	}

	/**
	 * Checks if a root bommel exists for the current organization.
	 *
	 * @return true if a root bommel exists
	 */
	public boolean hasRoot()
	{
		return findRoot() != null;
	}

	/**
	 * Finds all children of the given parent bommel within the current
	 * organization.
	 *
	 * @param parent
	 *            The parent bommel
	 * @return List of child bommels
	 */
	public List<Bommel> findChildren(Bommel parent)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return list("parent = ?1 and organization.id = ?2", parent, orgId);
	}

	/**
	 * Checks if the given bommel has any children within the current
	 * organization.
	 *
	 * @param bommel
	 *            The parent bommel to check
	 * @return true if the bommel has children
	 */
	public boolean hasChildren(Bommel bommel)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return false;
		}
		return count("parent = ?1 and organization.id = ?2", bommel, orgId) > 0;
	}

	/**
	 * Finds a bommel by ID, scoped to the current organization. This prevents
	 * cross-organization access.
	 *
	 * @param id
	 *            The bommel ID
	 * @return The bommel, or null if not found or not in current organization
	 */
	public Bommel findByIdScoped(Long id)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return null;
		}
		return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
	}
}
