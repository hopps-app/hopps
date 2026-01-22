package app.fuggs.member.repository;

import java.util.List;

import app.fuggs.member.domain.Member;
import app.fuggs.shared.security.OrganizationContext;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class MemberRepository implements PanacheRepository<Member>
{
	@Inject
	OrganizationContext organizationContext;

	/**
	 * Finds all members for the current organization, ordered by name.
	 *
	 * @return List of members in the current organization
	 */
	public List<Member> findAllOrderedByName()
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return list("organization.id = ?1 ORDER BY lastName, firstName", orgId);
	}

	/**
	 * Searches for members by name within the current organization.
	 *
	 * @param query
	 *            The search query
	 * @return List of matching members
	 */
	public List<Member> searchByName(String query)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return list("organization.id = ?1 and (lower(firstName) like ?2 or lower(lastName) like ?2)",
			orgId, "%" + query.toLowerCase() + "%");
	}

	/**
	 * Finds a member by email (NOT scoped to organization). Used for
	 * authentication and bootstrap purposes.
	 *
	 * @param email
	 *            The email address
	 * @return The member, or null if not found
	 */
	public Member findByEmail(String email)
	{
		return find("email", email).firstResult();
	}

	/**
	 * Finds a member by Keycloak user ID (NOT scoped to organization). Used for
	 * authentication purposes.
	 *
	 * @param keycloakUserId
	 *            The Keycloak user ID
	 * @return The member, or null if not found
	 */
	public Member findByKeycloakUserId(String keycloakUserId)
	{
		return find("keycloakUserId", keycloakUserId).firstResult();
	}

	/**
	 * Finds a member by ID, scoped to the current organization. This prevents
	 * cross-organization access.
	 *
	 * @param id
	 *            The member ID
	 * @return The member, or null if not found or not in current organization
	 */
	public Member findByIdScoped(Long id)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return null;
		}
		return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
	}

	/**
	 * Finds a member by their username.
	 *
	 * @param userName
	 *            The username of the member to search for.
	 * @return The member with the specified username, or null if no such member
	 *         exists.
	 */
	public Member findByUsername(String userName)
	{
		return find("userName", userName).firstResult();
	}
}
