package app.fuggs.document.repository;

import java.util.List;

import app.fuggs.document.domain.TradeParty;
import app.fuggs.shared.security.OrganizationContext;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class TradePartyRepository implements PanacheRepository<TradeParty>
{
	@Inject
	OrganizationContext organizationContext;

	/**
	 * Finds trade parties by name within the current organization.
	 *
	 * @param name
	 *            The name to search for
	 * @return List of matching trade parties
	 */
	public List<TradeParty> findByNameContaining(String name)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return find("LOWER(name) LIKE LOWER(?1) AND organization.id = ?2",
			"%" + name + "%", orgId).list();
	}

	/**
	 * Finds a trade party by ID, scoped to the current organization. This
	 * prevents cross-organization access.
	 *
	 * @param id
	 *            The trade party ID
	 * @return The trade party, or null if not found or not in current
	 *         organization
	 */
	public TradeParty findByIdScoped(Long id)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return null;
		}
		return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
	}
}
