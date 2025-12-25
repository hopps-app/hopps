package app.hopps.document.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.Set;

import org.junit.jupiter.api.Test;

import app.hopps.document.repository.DocumentRepository;
import app.hopps.shared.domain.Tag;
import app.hopps.shared.repository.TagRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.transaction.Transactional.TxType;

@QuarkusTest
class DocumentTagTest
{
	@Inject
	DocumentRepository documentRepository;

	@Inject
	TagRepository tagRepository;

	@Test
	void shouldPersistDocumentWithTags()
	{
		deleteAllData();

		Long docId = createDocumentWithTags("Test Document", Set.of("food", "pizza"), TagSource.MANUAL);

		Document found = findDocumentById(docId);
		assertEquals(2, found.getDocumentTags().size());
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("food")));
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("pizza")));
	}

	@Test
	void shouldShareTagsBetweenDocuments()
	{
		deleteAllData();

		Long doc1Id = createDocumentWithTags("Doc 1", Set.of("shared", "unique1"), TagSource.MANUAL);
		Long doc2Id = createDocumentWithTags("Doc 2", Set.of("shared", "unique2"), TagSource.MANUAL);

		// Should only have 3 tags total (shared, unique1, unique2)
		assertEquals(3, countTags());

		Document doc1 = findDocumentById(doc1Id);
		Document doc2 = findDocumentById(doc2Id);

		// Find the shared tag in both documents
		Tag sharedTag1 = doc1.getDocumentTags().stream()
			.filter(dt -> dt.getName().equals("shared"))
			.map(DocumentTag::getTag)
			.findFirst()
			.orElseThrow();
		Tag sharedTag2 = doc2.getDocumentTags().stream()
			.filter(dt -> dt.getName().equals("shared"))
			.map(DocumentTag::getTag)
			.findFirst()
			.orElseThrow();

		// They should be the same tag entity
		assertEquals(sharedTag1.getId(), sharedTag2.getId());
	}

	@Test
	void shouldUpdateDocumentTags()
	{
		deleteAllData();

		Long docId = createDocumentWithTags("Test Doc", Set.of("old"), TagSource.MANUAL);

		updateDocumentTags(docId, Set.of("new1", "new2"));

		Document found = findDocumentById(docId);
		assertEquals(2, found.getDocumentTags().size());
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("new1")));
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("new2")));
	}

	@Test
	void shouldUpdateDocumentTagsWithSameTags()
	{
		// This test reproduces the duplicate key constraint error that occurs
		// when clearing tags and re-adding the same ones in the same
		// transaction
		deleteAllData();

		Long docId = createDocumentWithTags("Test Doc", Set.of("food", "pizza"), TagSource.MANUAL);

		// Update with the same tags - this should NOT cause a duplicate key
		// error
		updateDocumentTags(docId, Set.of("food", "pizza"));

		Document found = findDocumentById(docId);
		assertEquals(2, found.getDocumentTags().size());
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("food")));
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("pizza")));
	}

	@Test
	void shouldUpdateDocumentTagsWithPartialOverlap()
	{
		// Test with partial overlap: keep some, remove some, add some
		deleteAllData();

		Long docId = createDocumentWithTags("Test Doc", Set.of("food", "old"), TagSource.MANUAL);

		// Keep "food", remove "old", add "new"
		updateDocumentTags(docId, Set.of("food", "new"));

		Document found = findDocumentById(docId);
		assertEquals(2, found.getDocumentTags().size());
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("food")));
		assertTrue(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("new")));
		assertFalse(found.getDocumentTags().stream().anyMatch(dt -> dt.getName().equals("old")));
	}

	@Test
	void shouldHandleDocumentWithNoTags()
	{
		deleteAllData();

		Long docId = createDocumentWithTags("No Tags Doc", Set.of(), TagSource.MANUAL);

		Document found = findDocumentById(docId);
		assertTrue(found.getDocumentTags().isEmpty());
	}

	@Test
	void shouldIdentifyAiGeneratedTags()
	{
		Document doc = new Document();
		doc.setDocumentType(DocumentType.RECEIPT);
		doc.setTotal(BigDecimal.TEN);

		Tag aiTag = new Tag("food");
		Tag manualTag = new Tag("manual");
		doc.addTag(aiTag, TagSource.AI);
		doc.addTag(manualTag, TagSource.MANUAL);

		assertTrue(doc.hasAiTags());

		// Find the AI tag and manual tag from documentTags
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
		doc.setDocumentType(DocumentType.RECEIPT);
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
		doc.setDocumentType(DocumentType.RECEIPT);
		doc.setTotal(BigDecimal.TEN);

		Tag tag = new Tag("test");
		doc.addTag(tag, TagSource.MANUAL);

		assertFalse(doc.hasAiTags());
		assertTrue(doc.hasTags());
	}

	@Transactional(TxType.REQUIRES_NEW)
	void deleteAllData()
	{
		// Delete document_tag entries first (via native query to avoid cascade
		// issues)
		documentRepository.getEntityManager()
			.createNativeQuery("DELETE FROM document_tag")
			.executeUpdate();
		documentRepository.deleteAll();
		tagRepository.deleteAll();
	}

	@Transactional(TxType.REQUIRES_NEW)
	Long createDocumentWithTags(String name, Set<String> tagNames, TagSource source)
	{
		Set<Tag> tags = tagRepository.findOrCreateTags(tagNames);

		Document document = new Document();
		document.setName(name);
		document.setDocumentType(DocumentType.RECEIPT);
		document.setTotal(new BigDecimal("10.00"));
		document.setCurrencyCode("EUR");

		for (Tag tag : tags)
		{
			document.addTag(tag, source);
		}

		documentRepository.persist(document);
		return document.getId();
	}

	@Transactional(TxType.REQUIRES_NEW)
	Document findDocumentById(Long id)
	{
		Document doc = documentRepository.findById(id);
		// Force lazy loading of tags
		doc.getDocumentTags().size();
		return doc;
	}

	@Transactional(TxType.REQUIRES_NEW)
	void updateDocumentTags(Long docId, Set<String> newTagNames)
	{
		Document doc = documentRepository.findById(docId);

		// Build map of current tag name -> DocumentTag
		java.util.Map<String, DocumentTag> existingTags = doc.getDocumentTags().stream()
			.collect(java.util.stream.Collectors.toMap(
				dt -> dt.getName().toLowerCase(),
				dt -> dt,
				(a, b) -> a));

		// Find tags to remove
		Set<String> existingTagNames = existingTags.keySet();
		Set<String> tagsToRemove = new java.util.HashSet<>(existingTagNames);
		tagsToRemove.removeAll(newTagNames.stream().map(String::toLowerCase).collect(java.util.stream.Collectors.toSet()));

		// Find tags to add
		Set<String> tagsToAdd = new java.util.HashSet<>(newTagNames);
		tagsToAdd.removeAll(existingTagNames);

		// Remove tags
		for (String tagName : tagsToRemove)
		{
			DocumentTag docTag = existingTags.get(tagName);
			doc.getDocumentTags().remove(docTag);
		}

		// Add new tags
		if (!tagsToAdd.isEmpty())
		{
			Set<Tag> tags = tagRepository.findOrCreateTags(tagsToAdd);
			for (Tag tag : tags)
			{
				doc.addTag(tag, TagSource.MANUAL);
			}
		}
	}

	@Transactional(TxType.REQUIRES_NEW)
	long countTags()
	{
		return tagRepository.count();
	}
}
