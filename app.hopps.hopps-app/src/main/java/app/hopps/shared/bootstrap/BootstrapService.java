package app.hopps.shared.bootstrap;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.member.service.KeycloakAdminService;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.config.BootstrapData;
import app.hopps.shared.bootstrap.config.BootstrapData.OrganizationData;
import app.hopps.shared.bootstrap.config.BootstrapData.UserData;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Bootstrap service that ensures the application has the necessary initial
 * data: organizations, users with Member records, and root bommels.
 * <p>
 * Configuration is loaded from bootstrap-data.yaml.
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

	@Inject
	BootstrapData bootstrapData;

	/**
	 * Bootstraps all organizations from configuration. Returns list of
	 * created/existing organizations.
	 */
	@Transactional
	public List<Organization> bootstrapOrganizations()
	{
		LOG.info("Bootstrapping organizations...");

		List<Organization> orgs = new ArrayList<>();

		for (OrganizationData orgData : bootstrapData.getOrganizations())
		{
			Organization org = ensureOrganization(orgData);
			orgs.add(org);
			ensureRootBommel(org);
		}

		LOG.info("Bootstrapped {} organizations", orgs.size());
		return orgs;
	}

	/**
	 * Bootstraps all users from configuration with their Member records.
	 */
	@Transactional
	public void bootstrapUsers()
	{
		LOG.info("Bootstrapping users...");

		int count = 0;
		for (UserData userData : bootstrapData.getUsers())
		{
			bootstrapUser(userData);
			count++;
		}

		LOG.info("Bootstrapped {} users", count);
	}

	/**
	 * Bootstraps a single user: creates Keycloak user and links Member record.
	 */
	private void bootstrapUser(UserData userData)
	{
		// Get the organization for this user
		Organization org = organizationRepository.findBySlug(userData.getOrganizationSlug());
		if (org == null)
		{
			LOG.error("Cannot bootstrap user {} - organization '{}' not found", userData.getUsername(),
				userData.getOrganizationSlug());
			return;
		}

		// Check if Member already exists by username
		Member existingMember = memberRepository.findByUsername(userData.getUsername());
		if (existingMember != null)
		{
			LOG.info("User {} already exists (Member ID: {})", userData.getUsername(),
				existingMember.getId());
			return;
		}

		// Find or create Keycloak user (with retry logic for DevServices
		// timing)
		String keycloakUserId = findOrCreateKeycloakUser(userData, 10);
		if (keycloakUserId == null)
		{
			LOG.warn("Could not find or create Keycloak user for {}", userData.getUsername());
			return;
		}

		// Create Member record
		createMemberIfNotExisting(userData, org);
	}

	/**
	 * Finds or creates a Keycloak user. Handles DevServices timing with retry
	 * logic.
	 */
	private String findOrCreateKeycloakUser(UserData userData, int maxRetries)
	{
		// First, check if user exists (with retries for DevServices timing)
		String existingUserId = findKeycloakUserWithRetry(userData.getUsername(), maxRetries, 1000);
		if (existingUserId != null)
		{
			LOG.info("Found existing Keycloak user: {}", userData.getUsername());
			return existingUserId;
		}

		// User doesn't exist, create it
		try
		{
			String newUserId = keycloakAdminService.createUser(userData.getUsername(),
				userData.getEmail(), userData.getFirstName(), userData.getLastName(),
				userData.getRoles());
			LOG.info("Created Keycloak user: {} (id: {})", userData.getUsername(), newUserId);
			return newUserId;
		}
		catch (RuntimeException e)
		{
			// Handle race condition: user might have been created between our
			// check and creation
			if (e.getMessage() != null && e.getMessage().contains("User exists"))
			{
				LOG.info("User was created concurrently, fetching: {}", userData.getUsername());
				String userId = keycloakAdminService.findUserIdByUsername(userData.getUsername());
				if (userId != null)
				{
					return userId;
				}
			}
			LOG.error("Failed to create Keycloak user: {}", userData.getUsername(), e);
			throw e;
		}
	}

	/**
	 * Finds a Keycloak user by username with retry logic.
	 */
	private String findKeycloakUserWithRetry(String username, int maxAttempts, long delayMs)
	{
		for (int attempt = 1; attempt <= maxAttempts; attempt++)
		{
			String userId = keycloakAdminService.findUserIdByUsername(username);
			if (userId != null)
			{
				if (attempt > 1)
				{
					LOG.info("Found Keycloak user '{}' on attempt {}", username, attempt);
				}
				return userId;
			}

			if (attempt < maxAttempts)
			{
				LOG.debug("Keycloak user '{}' not found, retrying in {}ms (attempt {}/{})", username,
					delayMs, attempt, maxAttempts);
				try
				{
					Thread.sleep(delayMs);
				}
				catch (InterruptedException e)
				{
					Thread.currentThread().interrupt();
					LOG.warn("Interrupted while waiting to retry finding Keycloak user '{}'",
						username);
					return null;
				}
			}
		}
		return null;
	}

	/**
	 * Creates a Member record if one doesn't already exist.
	 */
	private void createMemberIfNotExisting(UserData userData, Organization org)
	{
		Member existingByUsername = memberRepository.findByUsername(userData.getUsername());
		if (existingByUsername != null)
		{
			LOG.info("Member {} already exists", existingByUsername.getUserName());
		}
		else
		{
			Member newMember = new Member();
			newMember.setUserName(userData.getUsername());
			newMember.setEmail(userData.getEmail());
			newMember.setFirstName(userData.getFirstName());
			newMember.setLastName(userData.getLastName());
			newMember.setOrganization(org);
			memberRepository.persist(newMember);

			LOG.info("Created member: {} {} ({}) linked to Keycloak user: {} via username equality",
				newMember.getFirstName(), newMember.getLastName(), newMember.getEmail(),
				userData.getUsername());
		}
	}

	/**
	 * Ensures an organization exists. Creates if not found.
	 */
	private Organization ensureOrganization(OrganizationData orgData)
	{
		Organization org = organizationRepository.findBySlug(orgData.getSlug());
		if (org != null)
		{
			LOG.debug("Organization already exists: {}", org.getName());
			return org;
		}

		org = new Organization();
		org.setName(orgData.getName());
		org.setSlug(orgData.getSlug());
		org.setDisplayName(orgData.getDisplayName());
		organizationRepository.persist(org);

		LOG.info("Created organization: {} (slug: {})", org.getName(), org.getSlug());
		return org;
	}

	/**
	 * Ensures a root bommel exists for an organization.
	 */
	@Transactional
	public void ensureRootBommel(Organization organization)
	{
		// Check if root bommel exists for this organization
		Bommel root = bommelRepository.find("parent is null and organization.id = ?1", organization.id)
			.firstResult();
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

	/**
	 * Returns the bootstrap data for use by DataSeeder.
	 */
	public BootstrapData getBootstrapData()
	{
		return bootstrapData;
	}
}
