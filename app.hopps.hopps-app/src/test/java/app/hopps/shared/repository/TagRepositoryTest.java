package app.hopps.shared.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;

import app.hopps.document.repository.DocumentRepository;
import app.hopps.shared.domain.Tag;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.transaction.Transactional.TxType;

@QuarkusTest
class TagRepositoryTest
{
	@Inject
	TagRepository tagRepository;

	@Inject
	DocumentRepository documentRepository;

	@Test
	void shouldCreateAndFindTagByName()
	{
		deleteAllTags();

		createTag("food");

		Optional<Tag> found = findTagByName("food");
		assertTrue(found.isPresent());
		assertEquals("food", found.get().getName());
	}

	@Test
	void shouldReturnEmptyWhenTagNotFound()
	{
		deleteAllTags();

		Optional<Tag> found = findTagByName("nonexistent");
		assertTrue(found.isEmpty());
	}

	@Test
	void shouldFindAllTagsOrderedByName()
	{
		deleteAllTags();

		createTag("zebra");
		createTag("apple");
		createTag("mango");

		List<Tag> tags = findAllOrderedByName();
		assertEquals(3, tags.size());
		assertEquals("apple", tags.get(0).getName());
		assertEquals("mango", tags.get(1).getName());
		assertEquals("zebra", tags.get(2).getName());
	}

	@Test
	void shouldFindOrCreateNewTag()
	{
		deleteAllTags();

		Tag tag = findOrCreateTag("newtag");
		assertNotNull(tag);
		assertNotNull(tag.getId());
		assertEquals("newtag", tag.getName());

		// Verify it was persisted
		Optional<Tag> found = findTagByName("newtag");
		assertTrue(found.isPresent());
	}

	@Test
	void shouldFindExistingTagInsteadOfCreatingDuplicate()
	{
		deleteAllTags();

		createTag("existing");
		long countBefore = countTags();

		Tag tag = findOrCreateTag("existing");
		long countAfter = countTags();

		assertEquals("existing", tag.getName());
		assertEquals(countBefore, countAfter);
	}

	@Test
	void shouldFindOrCreateMultipleTags()
	{
		deleteAllTags();

		createTag("existing1");

		Set<String> tagNames = Set.of("existing1", "new1", "new2");
		Set<Tag> tags = findOrCreateTags(tagNames);

		assertEquals(3, tags.size());
		assertEquals(3, countTags());
	}

	@Test
	void shouldHandleEmptyTagSet()
	{
		deleteAllTags();

		Set<Tag> tags = findOrCreateTags(Set.of());
		assertTrue(tags.isEmpty());
	}

	@Transactional(TxType.REQUIRES_NEW)
	void deleteAllTags()
	{
		// Must delete documents first due to foreign key constraint
		documentRepository.deleteAll();
		tagRepository.deleteAll();
	}

	@Transactional(TxType.REQUIRES_NEW)
	void createTag(String name)
	{
		Tag tag = new Tag(name);
		tagRepository.persist(tag);
	}

	@Transactional(TxType.REQUIRES_NEW)
	Optional<Tag> findTagByName(String name)
	{
		return tagRepository.findByName(name);
	}

	@Transactional(TxType.REQUIRES_NEW)
	List<Tag> findAllOrderedByName()
	{
		return tagRepository.findAllOrderedByName();
	}

	@Transactional(TxType.REQUIRES_NEW)
	Tag findOrCreateTag(String name)
	{
		return tagRepository.findOrCreateTag(name);
	}

	@Transactional(TxType.REQUIRES_NEW)
	Set<Tag> findOrCreateTags(Set<String> names)
	{
		return tagRepository.findOrCreateTags(names);
	}

	@Transactional(TxType.REQUIRES_NEW)
	long countTags()
	{
		return tagRepository.count();
	}
}
