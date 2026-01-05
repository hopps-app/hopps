package app.hopps.shared.bootstrap;

import java.util.List;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.member.service.KeycloakAdminService;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Bootstrap service that ensures the application has the necessary initial
 * data: - Default organization - Super admin user - Root bommel for the
 * organization
 * <p>
 * This service is idempotent and can be run multiple times safely.
 */
@ApplicationScoped
public class BootstrapService
{
	private static final Logger LOG = LoggerFactory.getLogger(BootstrapService.class);

	@Inject
	OrganizationRepository organizationRepository;

	@Inject
	MemberRepository memberRepository;

	@Inject
	BommelRepository bommelRepository;

	@Inject
	KeycloakAdminService keycloakAdminService;

	@ConfigProperty(name = "hopps.bootstrap.super-admin.username")
	String superAdminUsername;

	@ConfigProperty(name = "hopps.bootstrap.super-admin.email")
	String superAdminEmail;

	@ConfigProperty(name = "hopps.bootstrap.super-admin.first-name")
	String superAdminFirstName;

	@ConfigProperty(name = "hopps.bootstrap.super-admin.last-name")
	String superAdminLastName;

	@ConfigProperty(name = "hopps.bootstrap.organization.name")
	String defaultOrgName;

	@ConfigProperty(name = "hopps.bootstrap.organization.slug")
	String defaultOrgSlug;

	@ConfigProperty(name = "hopps.bootstrap.organization.display-name")
	String defaultOrgDisplayName;

	/**
	 * Runs the bootstrap process. This is idempotent and can be safely run
	 * multiple times.
	 */
	@Transactional
	public void bootstrap()
	{
		LOG.info("Starting bootstrap process...");

		try
		{
			// 1. Ensure default organization exists
			Organization defaultOrg = ensureDefaultOrganization();

			// 2. Ensure super admin exists
			ensureSuperAdmin(defaultOrg);

			// 3. Ensure root bommel exists for the organization
			ensureRootBommel(defaultOrg);

			LOG.info("Bootstrap process completed successfully");
		}
		catch (Exception e)
		{
			LOG.error("Bootstrap process failed", e);
			throw e;
		}
	}

	private Organization ensureDefaultOrganization()
	{
		Organization org = organizationRepository.findBySlug(defaultOrgSlug);
		if (org != null)
		{
			LOG.debug("Default organization already exists: {}", org.getName());
			return org;
		}

		org = new Organization();
		org.setName(defaultOrgName);
		org.setSlug(defaultOrgSlug);
		org.setDisplayName(defaultOrgDisplayName);
		organizationRepository.persist(org);

		LOG.info("Created default organization: {} (slug: {})", org.getName(), org.getSlug());
		return org;
	}

	private void ensureSuperAdmin(Organization organization)
	{
		Member member = memberRepository.findByEmail(superAdminEmail);
		if (member != null)
		{
			LOG.debug("Super admin already exists: {}", member.getEmail());
			return;
		}

		member = new Member();
		member.setFirstName(superAdminFirstName);
		member.setLastName(superAdminLastName);
		member.setEmail(superAdminEmail);
		member.setOrganization(organization);

		try
		{
			// Create Keycloak user with super_admin, admin, and user roles
			String keycloakUserId = keycloakAdminService.createUser(
				superAdminUsername,
				superAdminEmail,
				superAdminFirstName,
				superAdminLastName,
				List.of("super_admin", "admin", "user"));

			member.setKeycloakUserId(keycloakUserId);
			memberRepository.persist(member);

			LOG.info("Created super admin: {} ({})", member.getDisplayName(), member.getEmail());
		}
		catch (RuntimeException e)
		{
			// If Keycloak user already exists (HTTP 409), just log and continue
			// The member record won't be created but that's okay - it will be
			// synced later
			if (e.getMessage() != null && e.getMessage().contains("User exists"))
			{
				LOG.warn("Super admin user already exists in Keycloak: {}", superAdminUsername);
			}
			else
			{
				// Re-throw other exceptions
				throw e;
			}
		}
	}

	private void ensureRootBommel(Organization organization)
	{
		// Check if root bommel exists for this organization
		Bommel root = bommelRepository.find("parent is null and organization.id = ?1", organization.id).firstResult();
		if (root != null)
		{
			LOG.debug("Root bommel already exists for organization: {}", organization.getName());
			return;
		}

		root = new Bommel();
		root.setTitle(organization.getDisplayName());
		root.setIcon("enterprise");
		root.setOrganization(organization);
		bommelRepository.persist(root);

		LOG.info("Created root bommel for organization: {}", organization.getName());
	}
}
