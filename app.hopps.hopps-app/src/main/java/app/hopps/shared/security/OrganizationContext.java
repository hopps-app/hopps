package app.hopps.shared.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import io.quarkus.security.identity.SecurityIdentity;
import io.vertx.ext.web.Session;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;

/**
 * Request-scoped service that resolves the current organization for the
 * authenticated user.
 * <p>
 * For regular users (admin, user roles): Returns the organization from their
 * Member record. For super admins: Uses session-based organization switching,
 * allowing them to view/manage any organization.
 * </p>
 */
@RequestScoped
@Named("organizationContext")
public class OrganizationContext
{
	private static final Logger LOG = LoggerFactory.getLogger(OrganizationContext.class);
	private static final String SESSION_ORG_ID = "current_organization_id";

	@Inject
	SecurityIdentity securityIdentity;

	@Inject
	MemberRepository memberRepository;

	@Inject
	OrganizationRepository organizationRepository;

	@Inject
	Session session;

	/**
	 * Gets the current organization for the authenticated user.
	 *
	 * @return The current organization, or null if user is not authenticated or
	 *         has no organization
	 */
	public Organization getCurrentOrganization()
	{
		if (securityIdentity.isAnonymous())
		{
			return null;
		}

		// Super admin: use session-based org switcher
		if (securityIdentity.hasRole("super_admin"))
		{
			Long orgId = session.get(SESSION_ORG_ID);
			if (orgId != null)
			{
				Organization org = organizationRepository.findById(orgId);
				if (org != null)
				{
					return org;
				}
				// Invalid org ID in session, clear it
				session.remove(SESSION_ORG_ID);
			}

			// No org selected or invalid - default to first available
			Organization firstOrg = organizationRepository.findAll().firstResult();
			if (firstOrg != null)
			{
				// Store in session for next request
				session.put(SESSION_ORG_ID, firstOrg.id);
			}
			return firstOrg;
		}

		// Regular users: get from their member record
		String username = securityIdentity.getPrincipal().getName();
		Member member = memberRepository.findByKeycloakUserId(username);
		if (member == null)
		{
			LOG.warn("No member found for user: {}", username);
			return null;
		}

		return member.getOrganization();
	}

	/**
	 * Switches the current organization (super admin only).
	 *
	 * @param organizationId
	 *            The ID of the organization to switch to
	 * @throws SecurityException
	 *             if the user is not a super admin
	 */
	public void switchOrganization(Long organizationId)
	{
		if (!securityIdentity.hasRole("super_admin"))
		{
			throw new SecurityException("Only super admins can switch organizations");
		}

		Organization org = organizationRepository.findById(organizationId);
		if (org == null)
		{
			throw new IllegalArgumentException("Organization not found: " + organizationId);
		}

		session.put(SESSION_ORG_ID, organizationId);
		LOG.info("Super admin {} switched to organization: {}", securityIdentity.getPrincipal().getName(),
			org.getName());
	}

	/**
	 * Gets the ID of the current organization.
	 *
	 * @return The organization ID, or null if no organization is available
	 */
	public Long getCurrentOrganizationId()
	{
		Organization org = getCurrentOrganization();
		return org != null ? org.id : null;
	}

	/**
	 * Checks if the current user is a super admin.
	 *
	 * @return true if the user has the super_admin role
	 */
	public boolean isSuperAdmin()
	{
		return securityIdentity.hasRole("super_admin");
	}
}
