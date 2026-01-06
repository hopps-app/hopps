package app.hopps.shared;

import java.util.HashSet;
import java.util.Set;

import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
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

	@Inject
	protected MemberRepository memberRepository;

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
	 * Creates or gets a test member by email. This is used to set up
	 * organization context for tests using @TestSecurity. Pass
	 * TestSecurityHelper constants as the email to match @TestSecurity user
	 * names.
	 *
	 * @param email
	 *            The member's email (use TestSecurityHelper constants like
	 *            TEST_USER)
	 * @param org
	 *            The organization for this member
	 * @return The created or existing member
	 */
	@Transactional(Transactional.TxType.REQUIRES_NEW)
	protected Member createTestMember(String email, Organization org)
	{
		Member member = memberRepository.findByEmail(email);
		if (member != null)
		{
			return member;
		}

		member = new Member();
		member.setEmail(email);
		member.setFirstName("Test");
		member.setLastName("User");
		member.setOrganization(org);
		// No keycloakUserId needed for test members - OrganizationContext uses
		// email
		memberRepository.persist(member);
		return member;
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
