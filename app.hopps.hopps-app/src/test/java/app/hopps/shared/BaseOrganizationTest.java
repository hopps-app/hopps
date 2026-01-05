package app.hopps.shared;

import java.util.HashSet;
import java.util.Set;

import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.domain.Tag;
import app.hopps.shared.repository.TagRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Base class for tests that need organization support. Provides helper methods
 * to create and manage test organizations.
 */
public abstract class BaseOrganizationTest
{
	@Inject
	protected OrganizationRepository organizationRepository;

	@Inject
	protected TagRepository tagRepository;

	/**
	 * Creates or gets the default test organization. Call this in test methods
	 * that need an organization.
	 *
	 * @return The default test organization
	 */
	@Transactional(Transactional.TxType.REQUIRES_NEW)
	protected Organization getOrCreateTestOrganization()
	{
		Organization org = organizationRepository.findBySlug("test-org");
		if (org == null)
		{
			org = new Organization();
			org.setName("Test Organization");
			org.setSlug("test-org");
			org.setDisplayName("Test Organization");
			org.setActive(true);
			organizationRepository.persist(org);
		}
		return org;
	}

	/**
	 * Creates a new organization for testing with a unique slug.
	 *
	 * @param slug
	 *            The organization slug
	 * @param name
	 *            The organization name
	 * @return The created organization
	 */
	@Transactional(Transactional.TxType.REQUIRES_NEW)
	protected Organization createOrganization(String slug, String name)
	{
		Organization org = new Organization();
		org.setName(name);
		org.setSlug(slug);
		org.setDisplayName(name);
		org.setActive(true);
		organizationRepository.persist(org);
		return org;
	}

	/**
	 * Creates tags for the given organization. Use this in tests instead of
	 * tagRepository.findOrCreateTags() since that requires an authenticated
	 * user context.
	 *
	 * @param tagNames
	 *            Set of tag names to create
	 * @param organization
	 *            The organization to associate tags with
	 * @return Set of created/existing tags
	 */
	protected Set<Tag> createTags(Set<String> tagNames, Organization organization)
	{
		Set<Tag> tags = new HashSet<>();
		for (String name : tagNames)
		{
			Tag tag = new Tag(name);
			tag.setOrganization(organization);
			tagRepository.persist(tag);
			tags.add(tag);
		}
		return tags;
	}

	/**
	 * Deletes all organizations from the database. Useful for test cleanup.
	 */
	@Transactional(Transactional.TxType.REQUIRES_NEW)
	protected void deleteAllOrganizations()
	{
		organizationRepository.deleteAll();
	}
}
