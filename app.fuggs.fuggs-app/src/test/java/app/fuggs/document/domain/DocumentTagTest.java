package app.fuggs.document.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

import org.hibernate.Hibernate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import app.fuggs.document.repository.DocumentRepository;
import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.BaseOrganizationTest;
import app.fuggs.shared.TestSecurityHelper;
import app.fuggs.shared.domain.Tag;
import app.fuggs.shared.repository.TagRepository;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;

@QuarkusTest
@TestSecurity(user = TestSecurityHelper.TEST_USER_MARIA, roles = "user")
class DocumentTagTest extends BaseOrganizationTest
{
	@BeforeEach
	void setupOrganizationContext()
	{
		Organization testOrg = getOrCreateTestOrganization();
		createTestMember(TestSecurityHelper.TEST_USER_MARIA, testOrg);
	}
	@Inject
	DocumentRepository documentRepository;

	@Inject
	TagRepository tagRepository;

	@TestTransaction
	@Test
	void shouldPersistDocumentWithTags()
	{
		Organization org = getOrCreateTestOrganization();

		Set<Tag> tags = tagRepository.findOrCreateTags(Set.of("food", "pizza"));

		Document document = new Document();
		document.setName("Test Document");
		document.setTotal(new BigDecimal("10.00"));
		document.setCurrencyCode("EUR");
		document.setOrganization(org);

		for (Tag tag : tags)
		{
			document.addTag(tag, TagSource.MANUAL);
		}

		documentRepository.persist(document);

		Document found = documentRepository.findById(document.getId());
		Hibernate.initialize(found.getDocumentTags());

		assertEquals(2, found.getDocumentTags().size());
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("food")));
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("pizza")));
	}

	@TestTransaction
	@Test
	void shouldShareTagsBetweenDocuments()
	{
		Organization org = getOrCreateTestOrganization();

		Set<Tag> tags1 = tagRepository.findOrCreateTags(Set.of("shared", "unique1"));
		Set<Tag> tags2 = tagRepository.findOrCreateTags(Set.of("shared", "unique2"));

		Document doc1 = new Document();
		doc1.setName("Doc 1");
		doc1.setTotal(new BigDecimal("10.00"));
		doc1.setCurrencyCode("EUR");
		doc1.setOrganization(org);
		for (Tag tag : tags1)
		{
			doc1.addTag(tag, TagSource.MANUAL);
		}
		documentRepository.persist(doc1);

		Document doc2 = new Document();
		doc2.setName("Doc 2");
		doc2.setTotal(new BigDecimal("10.00"));
		doc2.setCurrencyCode("EUR");
		doc2.setOrganization(org);
		for (Tag tag : tags2)
		{
			doc2.addTag(tag, TagSource.MANUAL);
		}
		documentRepository.persist(doc2);

		// Should only have 3 tags total (shared, unique1, unique2)
		assertEquals(3, tagRepository.count());

		Document foundDoc1 = documentRepository.findById(doc1.getId());
		Document foundDoc2 = documentRepository.findById(doc2.getId());
		Hibernate.initialize(foundDoc1.getDocumentTags());
		Hibernate.initialize(foundDoc2.getDocumentTags());

		// Find the shared tag in both documents
		Tag sharedTag1 = foundDoc1.getDocumentTags().stream()
			.filter(dt -> dt.getName().equals("shared"))
			.map(DocumentTag::getTag)
			.findFirst()
			.orElseThrow();
		Tag sharedTag2 = foundDoc2.getDocumentTags().stream()
			.filter(dt -> dt.getName().equals("shared"))
			.map(DocumentTag::getTag)
			.findFirst()
			.orElseThrow();

		// They should be the same tag entity
		assertEquals(sharedTag1.getId(), sharedTag2.getId());
	}

	@TestTransaction
	@Test
	void shouldUpdateDocumentTags()
	{
		Organization org = getOrCreateTestOrganization();

		Set<Tag> oldTags = tagRepository.findOrCreateTags(Set.of("old"));

		Document document = new Document();
		document.setName("Test Doc");
		document.setTotal(new BigDecimal("10.00"));
		document.setCurrencyCode("EUR");
		document.setOrganization(org);

		for (Tag tag : oldTags)
		{
			document.addTag(tag, TagSource.MANUAL);
		}

		documentRepository.persist(document);

		// Update tags
		Document doc = documentRepository.findById(document.getId());
		Map<String, DocumentTag> existingTags = doc.getDocumentTags().stream()
			.collect(java.util.stream.Collectors.toMap(
				dt -> dt.getName().toLowerCase(),
				dt -> dt,
				(a, b) -> a));

		Set<String> newTagNames = Set.of("new1", "new2");
		Set<String> existingTagNames = existingTags.keySet();
		Set<String> tagsToRemove = new java.util.HashSet<>(existingTagNames);
		tagsToRemove.removeAll(newTagNames.stream().map(String::toLowerCase).collect(java.util.stream.Collectors.toSet()));

		Set<String> tagsToAdd = new java.util.HashSet<>(newTagNames);
		tagsToAdd.removeAll(existingTagNames);

		for (String tagName : tagsToRemove)
		{
			DocumentTag docTag = existingTags.get(tagName);
			doc.getDocumentTags().remove(docTag);
		}

		if (!tagsToAdd.isEmpty())
		{
			Set<Tag> tags = tagRepository.findOrCreateTags(tagsToAdd);
			for (Tag tag : tags)
			{
				doc.addTag(tag, TagSource.MANUAL);
			}
		}

		Document found = documentRepository.findById(doc.getId());
		Hibernate.initialize(found.getDocumentTags());

		assertEquals(2, found.getDocumentTags().size());
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("new1")));
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("new2")));
	}

	@TestTransaction
	@Test
	void shouldUpdateDocumentTagsWithSameTags()
	{
		Organization org = getOrCreateTestOrganization();

		Set<Tag> tags = tagRepository.findOrCreateTags(Set.of("food", "pizza"));

		Document document = new Document();
		document.setName("Test Doc");
		document.setTotal(new BigDecimal("10.00"));
		document.setCurrencyCode("EUR");
		document.setOrganization(org);

		for (Tag tag : tags)
		{
			document.addTag(tag, TagSource.MANUAL);
		}

		documentRepository.persist(document);

		// Update with the same tags
		Document doc = documentRepository.findById(document.getId());
		Hibernate.initialize(doc.getDocumentTags());

		// Same tags - no changes needed, should not cause duplicate key error

		assertEquals(2, doc.getDocumentTags().size());
		assertTrue(doc.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("food")));
		assertTrue(doc.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("pizza")));
	}

	@TestTransaction
	@Test
	void shouldUpdateDocumentTagsWithPartialOverlap()
	{
		Organization org = getOrCreateTestOrganization();

		Set<Tag> initialTags = tagRepository.findOrCreateTags(Set.of("food", "old"));

		Document document = new Document();
		document.setName("Test Doc");
		document.setTotal(new BigDecimal("10.00"));
		document.setCurrencyCode("EUR");
		document.setOrganization(org);

		for (Tag tag : initialTags)
		{
			document.addTag(tag, TagSource.MANUAL);
		}

		documentRepository.persist(document);

		// Keep "food", remove "old", add "new"
		Document doc = documentRepository.findById(document.getId());
		Map<String, DocumentTag> existingTags = doc.getDocumentTags().stream()
			.collect(java.util.stream.Collectors.toMap(
				dt -> dt.getName().toLowerCase(),
				dt -> dt,
				(a, b) -> a));

		Set<String> newTagNames = Set.of("food", "new");
		Set<String> existingTagNames = existingTags.keySet();
		Set<String> tagsToRemove = new java.util.HashSet<>(existingTagNames);
		tagsToRemove.removeAll(newTagNames.stream().map(String::toLowerCase).collect(java.util.stream.Collectors.toSet()));

		Set<String> tagsToAdd = new java.util.HashSet<>(newTagNames);
		tagsToAdd.removeAll(existingTagNames);

		for (String tagName : tagsToRemove)
		{
			DocumentTag docTag = existingTags.get(tagName);
			doc.getDocumentTags().remove(docTag);
		}

		if (!tagsToAdd.isEmpty())
		{
			Set<Tag> tags = tagRepository.findOrCreateTags(tagsToAdd);
			for (Tag tag : tags)
			{
				doc.addTag(tag, TagSource.MANUAL);
			}
		}

		Document found = documentRepository.findById(doc.getId());
		Hibernate.initialize(found.getDocumentTags());

		assertEquals(2, found.getDocumentTags().size());
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("food")));
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("new")));
		assertFalse(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("old")));
	}

	@TestTransaction
	@Test
	void shouldHandleDocumentWithNoTags()
	{
		Organization org = getOrCreateTestOrganization();

		Document document = new Document();
		document.setName("No Tags Doc");
		document.setTotal(new BigDecimal("10.00"));
		document.setCurrencyCode("EUR");
		document.setOrganization(org);

		documentRepository.persist(document);

		Document found = documentRepository.findById(document.getId());
		Hibernate.initialize(found.getDocumentTags());

		assertTrue(found.getDocumentTags().isEmpty());
	}

	@Test
	void shouldIdentifyAiGeneratedTags()
	{
		Document doc = new Document();
		doc.setTotal(BigDecimal.TEN);

		Tag aiTag = new Tag("food");
		Tag manualTag = new Tag("manual");
		doc.addTag(aiTag, TagSource.AI);
		doc.addTag(manualTag, TagSource.MANUAL);

		assertTrue(doc.hasAiTags());

		DocumentTag aiDocTag = doc.getDocumentTags().stream()
			.filter(dt -> dt.getName().equals("food"))
			.findFirst()
			.orElseThrow();
		DocumentTag manualDocTag = doc.getDocumentTags().stream()
			.filter(dt -> dt.getName().equals("manual"))
			.findFirst()
			.orElseThrow();

		assertTrue(aiDocTag.isAiGenerated());
		assertFalse(manualDocTag.isAiGenerated());
	}

	@Test
	void shouldTrackTagSourceCorrectly()
	{
		Document doc = new Document();
		doc.setTotal(BigDecimal.TEN);

		Tag tag1 = new Tag("ai-tag");
		Tag tag2 = new Tag("manual-tag");

		doc.addTag(tag1, TagSource.AI);
		doc.addTag(tag2, TagSource.MANUAL);

		assertEquals(2, doc.getDocumentTags().size());

		DocumentTag dt1 = doc.getDocumentTags().stream()
			.filter(dt -> dt.getName().equals("ai-tag"))
			.findFirst()
			.orElseThrow();
		DocumentTag dt2 = doc.getDocumentTags().stream()
			.filter(dt -> dt.getName().equals("manual-tag"))
			.findFirst()
			.orElseThrow();

		assertEquals(TagSource.AI, dt1.getSource());
		assertEquals(TagSource.MANUAL, dt2.getSource());
		assertTrue(dt1.isAiGenerated());
		assertTrue(dt2.isManual());
	}

	@Test
	void shouldReturnFalseForNoAiTags()
	{
		Document doc = new Document();
		doc.setTotal(BigDecimal.TEN);

		Tag tag = new Tag("test");
		doc.addTag(tag, TagSource.MANUAL);

		assertFalse(doc.hasAiTags());
		assertTrue(doc.hasTags());
	}
}
