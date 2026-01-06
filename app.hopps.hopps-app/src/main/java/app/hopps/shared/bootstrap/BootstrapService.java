package app.hopps.shared.bootstrap;

import java.util.ArrayList;
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
 * data: - 2 organizations - 3 users with Member records - Root bommels
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

	// Organization A config
	@ConfigProperty(name = "hopps.bootstrap.org-a.name")
	String orgAName;

	@ConfigProperty(name = "hopps.bootstrap.org-a.slug")
	String orgASlug;

	@ConfigProperty(name = "hopps.bootstrap.org-a.display-name")
	String orgADisplayName;

	// Organization B config
	@ConfigProperty(name = "hopps.bootstrap.org-b.name")
	String orgBName;

	@ConfigProperty(name = "hopps.bootstrap.org-b.slug")
	String orgBSlug;

	@ConfigProperty(name = "hopps.bootstrap.org-b.display-name")
	String orgBDisplayName;

	// User 1: Super Admin config
	@ConfigProperty(name = "hopps.bootstrap.users.admin.username")
	String adminUsername;

	@ConfigProperty(name = "hopps.bootstrap.users.admin.email")
	String adminEmail;

	@ConfigProperty(name = "hopps.bootstrap.users.admin.first-name")
	String adminFirstName;

	@ConfigProperty(name = "hopps.bootstrap.users.admin.last-name")
	String adminLastName;

	@ConfigProperty(name = "hopps.bootstrap.users.admin.roles")
	List<String> adminRoles;

	@ConfigProperty(name = "hopps.bootstrap.users.admin.organization")
	String adminOrganization;

	// User 2: Maria config
	@ConfigProperty(name = "hopps.bootstrap.users.maria.username")
	String mariaUsername;

	@ConfigProperty(name = "hopps.bootstrap.users.maria.email")
	String mariaEmail;

	@ConfigProperty(name = "hopps.bootstrap.users.maria.first-name")
	String mariaFirstName;

	@ConfigProperty(name = "hopps.bootstrap.users.maria.last-name")
	String mariaLastName;

	@ConfigProperty(name = "hopps.bootstrap.users.maria.roles")
	List<String> mariaRoles;

	@ConfigProperty(name = "hopps.bootstrap.users.maria.organization")
	String mariaOrganization;

	// User 3: Thomas config
	@ConfigProperty(name = "hopps.bootstrap.users.thomas.username")
	String thomasUsername;

	@ConfigProperty(name = "hopps.bootstrap.users.thomas.email")
	String thomasEmail;

	@ConfigProperty(name = "hopps.bootstrap.users.thomas.first-name")
	String thomasFirstName;

	@ConfigProperty(name = "hopps.bootstrap.users.thomas.last-name")
	String thomasLastName;

	@ConfigProperty(name = "hopps.bootstrap.users.thomas.roles")
	List<String> thomasRoles;

	@ConfigProperty(name = "hopps.bootstrap.users.thomas.organization")
	String thomasOrganization;

	/**
	 * User configuration record for bootstrapping users.
	 */
	private record UserConfig(String username, String email, String firstName, String lastName,
		List<String> roles, String organizationSlug)
	{
	}

	/**
	 * Bootstraps both organizations. Returns list of created/existing
	 * organizations.
	 */
	@Transactional
	public List<Organization> bootstrapOrganizations()
	{
		LOG.info("Bootstrapping organizations...");

		List<Organization> orgs = new ArrayList<>();

		// Create Organization A
		Organization orgA = ensureOrganization(orgASlug, orgAName, orgADisplayName);
		orgs.add(orgA);
		ensureRootBommel(orgA);

		// Create Organization B
		Organization orgB = ensureOrganization(orgBSlug, orgBName, orgBDisplayName);
		orgs.add(orgB);
		ensureRootBommel(orgB);

		LOG.info("Bootstrapped {} organizations", orgs.size());
		return orgs;
	}

	/**
	 * Bootstraps all 3 users with their Member records.
	 */
	@Transactional
	public void bootstrapUsers()
	{
		LOG.info("Bootstrapping users...");

		// Create user configs
		List<UserConfig> users = List.of(new UserConfig(adminUsername, adminEmail, adminFirstName,
			adminLastName, adminRoles, adminOrganization),
			new UserConfig(mariaUsername, mariaEmail, mariaFirstName, mariaLastName, mariaRoles,
				mariaOrganization),
			new UserConfig(thomasUsername, thomasEmail, thomasFirstName, thomasLastName, thomasRoles,
				thomasOrganization));

		// Bootstrap each user
		for (UserConfig userConfig : users)
		{
			bootstrapUser(userConfig);
		}

		LOG.info("Bootstrapped {} users", users.size());
	}

	/**
	 * Bootstraps a single user: creates Keycloak user and links Member record.
	 */
	private void bootstrapUser(UserConfig config)
	{
		// Get the organization for this user
		Organization org = organizationRepository.findBySlug(config.organizationSlug());
		if (org == null)
		{
			LOG.error("Cannot bootstrap user {} - organization '{}' not found", config.username(),
				config.organizationSlug());
			return;
		}

		// Check if Member already exists by email
		Member existingMember = memberRepository.findByEmail(config.email());
		if (existingMember != null && existingMember.getKeycloakUserId() != null)
		{
			LOG.debug("User {} already exists (Member ID: {}, Keycloak ID: {})", config.username(),
				existingMember.getId(), existingMember.getKeycloakUserId());
			return;
		}

		// Find or create Keycloak user (with retry logic for DevServices
		// timing)
		String keycloakUserId = findOrCreateKeycloakUser(config, 10);
		if (keycloakUserId == null)
		{
			LOG.warn("Could not find or create Keycloak user for {}", config.username());
			return;
		}

		// Create or link Member record
		createOrLinkMember(keycloakUserId, config, org);
	}

	/**
	 * Finds or creates a Keycloak user. Handles DevServices timing with retry
	 * logic.
	 *
	 * @param config
	 *            User configuration
	 * @param maxRetries
	 *            Maximum number of retries for finding existing users
	 * @return Keycloak user ID, or null if failed
	 */
	private String findOrCreateKeycloakUser(UserConfig config, int maxRetries)
	{
		// First, check if user exists (with retries for DevServices timing)
		String existingUserId = findKeycloakUserWithRetry(config.username(), maxRetries, 1000);
		if (existingUserId != null)
		{
			LOG.info("Found existing Keycloak user: {}", config.username());
			return existingUserId;
		}

		// User doesn't exist, create it
		try
		{
			String newUserId = keycloakAdminService.createUser(config.username(), config.email(),
				config.firstName(), config.lastName(), config.roles());
			LOG.info("Created Keycloak user: {} (id: {})", config.username(), newUserId);
			return newUserId;
		}
		catch (RuntimeException e)
		{
			// Handle race condition: user might have been created between our
			// check and creation
			if (e.getMessage() != null && e.getMessage().contains("User exists"))
			{
				LOG.info("User was created concurrently, fetching: {}", config.username());
				String userId = keycloakAdminService.findUserIdByUsername(config.username());
				if (userId != null)
				{
					return userId;
				}
			}
			LOG.error("Failed to create Keycloak user: {}", config.username(), e);
			throw e;
		}
	}

	/**
	 * Finds a Keycloak user by username with retry logic. DevServices may still
	 * be initializing users.
	 *
	 * @param username
	 *            Username to search for
	 * @param maxAttempts
	 *            Maximum retry attempts
	 * @param delayMs
	 *            Delay between retries in milliseconds
	 * @return Keycloak user ID, or null if not found
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
					LOG.warn("Interrupted while waiting to retry finding Keycloak user '{}'", username);
					return null;
				}
			}
		}
		return null;
	}

	/**
	 * Creates or links a Member record to a Keycloak user.
	 *
	 * @param keycloakUserId
	 *            Keycloak user ID
	 * @param config
	 *            User configuration
	 * @param org
	 *            Organization for this member
	 */
	private void createOrLinkMember(String keycloakUserId, UserConfig config, Organization org)
	{
		// Check if Member with this Keycloak ID already exists
		Member memberByKeycloakId = memberRepository.findByKeycloakUserId(keycloakUserId);
		if (memberByKeycloakId != null)
		{
			LOG.debug("Member already linked to Keycloak user: {} (Member ID: {})", config.username(),
				memberByKeycloakId.getId());
			return;
		}

		// Check if Member with this email exists (from demo data)
		Member existingByEmail = memberRepository.findByEmail(config.email());
		if (existingByEmail != null)
		{
			// Link existing member to Keycloak user
			existingByEmail.setKeycloakUserId(keycloakUserId);
			memberRepository.persist(existingByEmail);
			LOG.info("Linked existing member {} to Keycloak user: {}", existingByEmail.getEmail(),
				config.username());
			return;
		}

		// Create new Member record
		Member newMember = new Member();
		newMember.setKeycloakUserId(keycloakUserId);
		newMember.setEmail(config.email());
		newMember.setFirstName(config.firstName());
		newMember.setLastName(config.lastName());
		newMember.setOrganization(org);
		memberRepository.persist(newMember);

		LOG.info("Created member: {} {} ({}) linked to Keycloak user: {}", newMember.getFirstName(),
			newMember.getLastName(), newMember.getEmail(), config.username());
	}

	/**
	 * Ensures an organization exists. Creates if not found.
	 */
	private Organization ensureOrganization(String slug, String name, String displayName)
	{
		Organization org = organizationRepository.findBySlug(slug);
		if (org != null)
		{
			LOG.debug("Organization already exists: {}", org.getName());
			return org;
		}

		org = new Organization();
		org.setName(name);
		org.setSlug(slug);
		org.setDisplayName(displayName);
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
		Bommel root = bommelRepository
			.find("parent is null and organization.id = ?1", organization.id).firstResult();
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
