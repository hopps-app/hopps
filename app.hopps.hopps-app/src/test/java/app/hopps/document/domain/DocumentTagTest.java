package app.hopps.document.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
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

		Long docId = createDocumentWithTags("Test Document", Set.of("food", "pizza"));

		Document found = findDocumentById(docId);
		assertEquals(2, found.getTags().size());
		assertTrue(found.getTags().stream().anyMatch(t -> t.getName().equals("food")));
		assertTrue(found.getTags().stream().anyMatch(t -> t.getName().equals("pizza")));
	}

	@Test
	void shouldShareTagsBetweenDocuments()
	{
		deleteAllData();

		Long doc1Id = createDocumentWithTags("Doc 1", Set.of("shared", "unique1"));
		Long doc2Id = createDocumentWithTags("Doc 2", Set.of("shared", "unique2"));

		// Should only have 3 tags total (shared, unique1, unique2)
		assertEquals(3, countTags());

		Document doc1 = findDocumentById(doc1Id);
		Document doc2 = findDocumentById(doc2Id);

		// Find the shared tag in both documents
		Tag sharedTag1 = doc1.getTags().stream()
			.filter(t -> t.getName().equals("shared"))
			.findFirst()
			.orElseThrow();
		Tag sharedTag2 = doc2.getTags().stream()
			.filter(t -> t.getName().equals("shared"))
			.findFirst()
			.orElseThrow();

		// They should be the same tag entity
		assertEquals(sharedTag1.getId(), sharedTag2.getId());
	}

	@Test
	void shouldUpdateDocumentTags()
	{
		deleteAllData();

		Long docId = createDocumentWithTags("Test Doc", Set.of("old"));

		updateDocumentTags(docId, Set.of("new1", "new2"));

		Document found = findDocumentById(docId);
		assertEquals(2, found.getTags().size());
		assertTrue(found.getTags().stream().anyMatch(t -> t.getName().equals("new1")));
		assertTrue(found.getTags().stream().anyMatch(t -> t.getName().equals("new2")));
	}

	@Test
	void shouldHandleDocumentWithNoTags()
	{
		deleteAllData();

		Long docId = createDocumentWithTags("No Tags Doc", Set.of());

		Document found = findDocumentById(docId);
		assertTrue(found.getTags().isEmpty());
	}

	@Transactional(TxType.REQUIRES_NEW)
	void deleteAllData()
	{
		documentRepository.deleteAll();
		tagRepository.deleteAll();
	}

	@Transactional(TxType.REQUIRES_NEW)
	Long createDocumentWithTags(String name, Set<String> tagNames)
	{
		Set<Tag> tags = tagRepository.findOrCreateTags(tagNames);

		Document document = new Document();
		document.setName(name);
		document.setDocumentType(DocumentType.RECEIPT);
		document.setTotal(new BigDecimal("10.00"));
		document.setCurrencyCode("EUR");
		document.setTags(tags);

		documentRepository.persist(document);
		return document.getId();
	}

	@Transactional(TxType.REQUIRES_NEW)
	Document findDocumentById(Long id)
	{
		Document doc = documentRepository.findById(id);
		// Force lazy loading of tags
		doc.getTags().size();
		return doc;
	}

	@Transactional(TxType.REQUIRES_NEW)
	void updateDocumentTags(Long docId, Set<String> tagNames)
	{
		Document doc = documentRepository.findById(docId);
		Set<Tag> tags = tagRepository.findOrCreateTags(tagNames);
		doc.setTags(tags);
	}

	@Transactional(TxType.REQUIRES_NEW)
	long countTags()
	{
		return tagRepository.count();
	}
}
