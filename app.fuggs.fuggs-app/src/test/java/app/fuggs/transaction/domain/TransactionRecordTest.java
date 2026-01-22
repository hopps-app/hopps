package app.fuggs.transaction.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import app.fuggs.bommel.domain.Bommel;
import app.fuggs.bommel.repository.BommelRepository;
import app.fuggs.document.domain.Document;
import app.fuggs.document.repository.DocumentRepository;
import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.BaseOrganizationTest;
import app.fuggs.shared.TestSecurityHelper;
import app.fuggs.shared.domain.Tag;
import app.fuggs.shared.repository.TagRepository;
import app.fuggs.transaction.repository.TransactionRecordRepository;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;

@QuarkusTest
@TestSecurity(user = TestSecurityHelper.TEST_USER_MARIA, roles = "user")
class TransactionRecordTest extends BaseOrganizationTest
{
	@BeforeEach
	void setupOrganizationContext()
	{
		Organization testOrg = getOrCreateTestOrganization();
		createTestMember("maria", testOrg);
	}

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
		Organization org = getOrCreateTestOrganization();

		Set<Tag> tags = tagRepository.findOrCreateTags(Set.of("food", "travel"));

		TransactionRecord transaction = new TransactionRecord();
		transaction.setTotal(new BigDecimal("42.50"));
		transaction.setUploader("test@example.com");
		transaction.setOrganization(org);

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
		Organization org = getOrCreateTestOrganization();

		Bommel bommel = new Bommel();
		bommel.setTitle("Test Bommel");
		bommel.setIcon("folder");
		bommel.setOrganization(org);
		bommelRepository.persist(bommel);

		TransactionRecord transaction = new TransactionRecord();
		transaction.setTotal(new BigDecimal("100.00"));
		transaction.setUploader("test@example.com");
		transaction.setBommel(bommel);
		transaction.setOrganization(org);

		repository.persist(transaction);

		TransactionRecord found = repository.findById(transaction.getId());
		assertNotNull(found.getBommel());
		assertEquals("Test Bommel", found.getBommel().getTitle());
	}

	@TestTransaction
	@Test
	void shouldLinkToDocument()
	{
		Organization org = getOrCreateTestOrganization();

		Document document = new Document();
		document.setTotal(new BigDecimal("25.00"));
		document.setOrganization(org);
		documentRepository.persist(document);

		TransactionRecord transaction = new TransactionRecord();
		transaction.setTotal(new BigDecimal("25.00"));
		transaction.setUploader("test@example.com");
		transaction.setDocument(document);
		transaction.setOrganization(org);

		repository.persist(transaction);

		TransactionRecord found = repository.findById(transaction.getId());
		assertNotNull(found.getDocument());
		assertEquals(document.getId(), found.getDocument().getId());
	}

	@TestTransaction
	@Test
	void shouldShareTagsAcrossTransactions()
	{
		Organization org = getOrCreateTestOrganization();

		Set<Tag> tags = tagRepository.findOrCreateTags(Set.of("shared-tag"));

		TransactionRecord t1 = new TransactionRecord();
		t1.setTotal(BigDecimal.TEN);
		t1.setUploader("user1@example.com");
		t1.setOrganization(org);
		tags.forEach(tag -> t1.addTag(tag, TagSource.MANUAL));
		repository.persist(t1);

		TransactionRecord t2 = new TransactionRecord();
		t2.setTotal(BigDecimal.ONE);
		t2.setUploader("user2@example.com");
		t2.setOrganization(org);
		tags.forEach(tag -> t2.addTag(tag, TagSource.MANUAL));
		repository.persist(t2);

		// Should only have 1 tag in the tag table
		assertEquals(1, tagRepository.count());
	}
}
