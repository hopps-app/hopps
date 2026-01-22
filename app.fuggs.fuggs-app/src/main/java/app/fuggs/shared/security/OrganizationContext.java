package app.fuggs.shared.security;

import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.eclipse.microprofile.jwt.JsonWebToken;

import app.fuggs.member.domain.Member;
import app.fuggs.member.repository.MemberRepository;
import app.fuggs.organization.domain.Organization;
import app.fuggs.organization.repository.OrganizationRepository;
import io.quarkus.security.identity.SecurityIdentity;
import io.vertx.ext.web.RoutingContext;
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
	RoutingContext routingContext;

	/**
	 * Gets the current organization for the authenticated user.
	 *
	 * @return The current organization, or null if user is not authenticated or
	 *         has no organization
	 */
	public Organization getCurrentOrganization()
	{
		// Anonymous users (e.g., in tests without @TestSecurity): return first
		// org
		if (securityIdentity.isAnonymous())
		{
			throw new IllegalStateException("Anonymous users cannot have an organization");
		}

		// Super admin: use session-based org switcher
		if (securityIdentity.hasRole(Roles.SUPER_ADMIN))
		{
			return getOrganizationForSuperAdmin();
		}

		String username = securityIdentity.getPrincipal().getName();
		Member member = memberRepository.findByUsername(username);
		if (member == null)
		{
			LOG.error("No member found for username: {}", username);
			throw new IllegalStateException("No member found for username: " + username);
		}

		return member.getOrganization();
	}

	private @Nullable Organization getOrganizationForSuperAdmin()
	{
		// Check if session is available (might not be in tests)
		if (routingContext != null && routingContext.session() != null)
		{
			Long orgId = routingContext.session().get(SESSION_ORG_ID);
			if (orgId != null)
			{
				Organization org = organizationRepository.findById(orgId);
				if (org != null)
				{
					return org;
				}
				// Invalid org ID in session, clear it
				routingContext.session().remove(SESSION_ORG_ID);
			}

			// No org selected or invalid - default to first available
			Organization firstOrg = organizationRepository.findAll().firstResult();
			if (firstOrg != null)
			{
				// Store in session for next request
				routingContext.session().put(SESSION_ORG_ID, firstOrg.id);
			}
			return firstOrg;
		}
		else
		{
			throw new IllegalStateException("No session available for organization context");
		}
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
		if (!securityIdentity.hasRole(Roles.SUPER_ADMIN))
		{
			throw new SecurityException("Only super admins can switch organizations");
		}

		Organization org = organizationRepository.findById(organizationId);
		if (org == null)
		{
			throw new IllegalArgumentException("Organization not found: " + organizationId);
		}

		if (routingContext != null && routingContext.session() != null)
		{
			routingContext.session().put(SESSION_ORG_ID, organizationId);
			LOG.info("Super admin {} switched to organization: {}", securityIdentity.getPrincipal().getName(),
				org.getName());
		}
		else
		{
			LOG.warn("Cannot switch organization - no session available (test environment?)");
		}
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
		return securityIdentity.hasRole(Roles.SUPER_ADMIN);
	}
}
