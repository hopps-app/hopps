package app.fuggs.shared.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import app.fuggs.document.repository.DocumentRepository;
import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.BaseOrganizationTest;
import app.fuggs.shared.TestSecurityHelper;
import app.fuggs.shared.domain.Tag;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;

@QuarkusTest
@TestSecurity(user = TestSecurityHelper.TEST_USER_MARIA, roles = "user")
class TagRepositoryTest extends BaseOrganizationTest
{
	@BeforeEach
	void setupOrganizationContext()
	{
		Organization testOrg = getOrCreateTestOrganization();
		createTestMember(TestSecurityHelper.TEST_USER_MARIA, testOrg);
	}

	@Inject
	TagRepository tagRepository;

	@Inject
	DocumentRepository documentRepository;

	@TestTransaction
	@Test
	void shouldCreateAndFindTagByName()
	{
		Organization org = getOrCreateTestOrganization();

		Tag tag = new Tag("food");
		tag.setOrganization(org);
		tagRepository.persist(tag);

		Optional<Tag> found = tagRepository.findByName("food");
		assertTrue(found.isPresent());
		assertEquals("food", found.get().getName());
	}

	@TestTransaction
	@Test
	void shouldReturnEmptyWhenTagNotFound()
	{
		Optional<Tag> found = tagRepository.findByName("nonexistent");
		assertTrue(found.isEmpty());
	}

	@TestTransaction
	@Test
	void shouldFindAllTagsOrderedByName()
	{
		Organization org = getOrCreateTestOrganization();

		Tag tag1 = new Tag("zebra");
		tag1.setOrganization(org);
		tagRepository.persist(tag1);

		Tag tag2 = new Tag("apple");
		tag2.setOrganization(org);
		tagRepository.persist(tag2);

		Tag tag3 = new Tag("mango");
		tag3.setOrganization(org);
		tagRepository.persist(tag3);

		List<Tag> tags = tagRepository.findAllOrderedByName();
		assertEquals(3, tags.size());
		assertEquals("apple", tags.get(0).getName());
		assertEquals("mango", tags.get(1).getName());
		assertEquals("zebra", tags.get(2).getName());
	}

	@TestTransaction
	@Test
	void shouldFindOrCreateNewTag()
	{
		getOrCreateTestOrganization(); // Ensure org exists for findOrCreateTag

		Tag tag = tagRepository.findOrCreateTag("newtag");
		assertNotNull(tag);
		assertNotNull(tag.getId());
		assertEquals("newtag", tag.getName());

		// Verify it was persisted
		Optional<Tag> found = tagRepository.findByName("newtag");
		assertTrue(found.isPresent());
	}

	@TestTransaction
	@Test
	void shouldFindExistingTagInsteadOfCreatingDuplicate()
	{
		Organization org = getOrCreateTestOrganization();

		Tag existing = new Tag("existing");
		existing.setOrganization(org);
		tagRepository.persist(existing);
		long countBefore = tagRepository.count();

		Tag tag = tagRepository.findOrCreateTag("existing");
		long countAfter = tagRepository.count();

		assertEquals("existing", tag.getName());
		assertEquals(countBefore, countAfter);
	}

	@TestTransaction
	@Test
	void shouldFindOrCreateMultipleTags()
	{
		Organization org = getOrCreateTestOrganization();

		Tag existing = new Tag("existing1");
		existing.setOrganization(org);
		tagRepository.persist(existing);

		Set<String> tagNames = Set.of("existing1", "new1", "new2");
		Set<Tag> tags = tagRepository.findOrCreateTags(tagNames);

		assertEquals(3, tags.size());
		assertEquals(3, tagRepository.count());
	}

	@TestTransaction
	@Test
	void shouldHandleEmptyTagSet()
	{
		Set<Tag> tags = tagRepository.findOrCreateTags(Set.of());
		assertTrue(tags.isEmpty());
	}
}
