package app.hopps.transaction.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.Set;

import org.junit.jupiter.api.Test;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.shared.domain.Tag;
import app.hopps.shared.repository.TagRepository;
import app.hopps.transaction.repository.TransactionRecordRepository;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

@QuarkusTest
class TransactionRecordTest
{
	@Inject
	TransactionRecordRepository repository;

	@Inject
	TagRepository tagRepository;

	@Inject
	BommelRepository bommelRepository;

	@Inject
	DocumentRepository documentRepository;

	@TestTransaction
	@Test
	void shouldPersistTransactionWithTags()
	{
		Set<Tag> tags = tagRepository.findOrCreateTags(Set.of("food", "travel"));

		TransactionRecord transaction = new TransactionRecord();
		transaction.setDocumentType(DocumentType.RECEIPT);
		transaction.setTotal(new BigDecimal("42.50"));
		transaction.setUploader("test@example.com");

		for (Tag tag : tags)
		{
			transaction.addTag(tag, TagSource.MANUAL);
		}

		repository.persist(transaction);

		TransactionRecord found = repository.findById(transaction.getId());
		assertEquals(2, found.getTransactionTags().size());
		assertTrue(found.hasTags());
	}

	@TestTransaction
	@Test
	void shouldLinkToBommel()
	{
		Bommel bommel = new Bommel();
		bommel.setTitle("Test Bommel");
		bommel.setIcon("folder");
		bommelRepository.persist(bommel);

		TransactionRecord transaction = new TransactionRecord();
		transaction.setDocumentType(DocumentType.INVOICE);
		transaction.setTotal(new BigDecimal("100.00"));
		transaction.setUploader("test@example.com");
		transaction.setBommel(bommel);

		repository.persist(transaction);

		TransactionRecord found = repository.findById(transaction.getId());
		assertNotNull(found.getBommel());
		assertEquals("Test Bommel", found.getBommel().getTitle());
	}

	@TestTransaction
	@Test
	void shouldLinkToDocument()
	{
		Document document = new Document();
		document.setDocumentType(DocumentType.RECEIPT);
		document.setTotal(new BigDecimal("25.00"));
		documentRepository.persist(document);

		TransactionRecord transaction = new TransactionRecord();
		transaction.setDocumentType(DocumentType.RECEIPT);
		transaction.setTotal(new BigDecimal("25.00"));
		transaction.setUploader("test@example.com");
		transaction.setDocument(document);

		repository.persist(transaction);

		TransactionRecord found = repository.findById(transaction.getId());
		assertNotNull(found.getDocument());
		assertEquals(document.getId(), found.getDocument().getId());
	}

	@TestTransaction
	@Test
	void shouldShareTagsAcrossTransactions()
	{
		Set<Tag> tags = tagRepository.findOrCreateTags(Set.of("shared-tag"));

		TransactionRecord t1 = new TransactionRecord();
		t1.setDocumentType(DocumentType.RECEIPT);
		t1.setTotal(BigDecimal.TEN);
		t1.setUploader("user1@example.com");
		tags.forEach(tag -> t1.addTag(tag, TagSource.MANUAL));
		repository.persist(t1);

		TransactionRecord t2 = new TransactionRecord();
		t2.setDocumentType(DocumentType.INVOICE);
		t2.setTotal(BigDecimal.ONE);
		t2.setUploader("user2@example.com");
		tags.forEach(tag -> t2.addTag(tag, TagSource.MANUAL));
		repository.persist(t2);

		// Should only have 1 tag in the tag table
		assertEquals(1, tagRepository.count());
	}
}
