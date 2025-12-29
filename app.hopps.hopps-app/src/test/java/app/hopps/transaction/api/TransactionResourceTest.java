package app.hopps.transaction.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.shared.domain.Tag;
import app.hopps.shared.repository.TagRepository;
import app.hopps.transaction.domain.TransactionRecord;
import app.hopps.transaction.repository.TransactionRecordRepository;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.transaction.Transactional.TxType;

@QuarkusTest
class TransactionResourceTest
{
	@Inject
	TransactionRecordRepository transactionRepository;

	@Inject
	BommelRepository bommelRepository;

	@Inject
	DocumentRepository documentRepository;

	@Inject
	TagRepository tagRepository;

	@Inject
	EntityManager entityManager;

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldShowTransactionList()
	{
		deleteAllData();
		createTestTransaction("Test Transaction", "100.00");

		given()
			.when().get("/transaktionen")
			.then()
			.statusCode(200)
			.body(containsString("Test Transaction"));
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldCreateTransactionFromScratch()
	{
		deleteAllData();
		Bommel bommel = createTestBommel("Test Bommel");

		given()
			.formParam("documentType", "RECEIPT")
			.formParam("total", "150.50")
			.formParam("name", "Office Supplies")
			.formParam("bommelId", bommel.getId())
			.when().post("/transaktionen/create")
			.then()
			.statusCode(303);

		List<TransactionRecord> transactions = transactionRepository.listAll();
		assertEquals(1, transactions.size());
		assertEquals("Office Supplies", transactions.get(0).getName());
		assertEquals(new BigDecimal("150.50"), transactions.get(0).getTotal());
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldConvertDocumentToTransaction()
	{
		deleteAllData();
		Document document = createTestDocument("Invoice #123", "500.00");

		given()
			.when().post("/belege/" + document.getId() + "/create-transaction")
			.then()
			.statusCode(303);

		List<TransactionRecord> transactions = transactionRepository.listAll();
		assertEquals(1, transactions.size());
		assertEquals(new BigDecimal("500.00"), transactions.get(0).getTotal());
		assertEquals(document.getId(), transactions.get(0).getDocument().getId());
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldPreserveAiTagsDuringConversion()
	{
		deleteAllData();
		Document document = createTestDocumentWithAiTag("Test Doc", "100", "ai-tag");

		given()
			.when().post("/belege/" + document.getId() + "/create-transaction")
			.then()
			.statusCode(303);

		List<TransactionRecord> transactions = transactionRepository.listAll();
		assertEquals(1, transactions.size());
		assertEquals(1, transactions.get(0).getTransactionTags().size());
		assertTrue(transactions.get(0).getTransactionTags().get(0).isAiGenerated());
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldUpdateTransaction()
	{
		deleteAllData();
		TransactionRecord transaction = createTestTransaction("Original Name", "100.00");

		given()
			.formParam("id", transaction.getId())
			.formParam("documentType", "INVOICE")
			.formParam("total", "200.00")
			.formParam("name", "Updated Name")
			.when().post("/transaktionen/update")
			.then()
			.statusCode(303);

		TransactionRecord updated = transactionRepository.findById(transaction.getId());
		assertEquals("Updated Name", updated.getName());
		assertEquals(new BigDecimal("200.00"), updated.getTotal());
		assertEquals(DocumentType.INVOICE, updated.getDocumentType());
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldDeleteTransaction()
	{
		deleteAllData();
		TransactionRecord transaction = createTestTransaction("To Delete", "50.00");

		given()
			.formParam("id", transaction.getId())
			.when().post("/transaktionen/delete")
			.then()
			.statusCode(303);

		List<TransactionRecord> transactions = transactionRepository.listAll();
		assertEquals(0, transactions.size());
	}

	@Test
	@TestSecurity(user = "bob", roles = "user")
	void shouldShowTransactionDetail()
	{
		deleteAllData();
		TransactionRecord transaction = createTestTransaction("Detail Test", "99.99");

		given()
			.when().get("/transaktionen/" + transaction.getId())
			.then()
			.statusCode(200)
			.body(containsString("Detail Test"));
	}

	@Transactional(TxType.REQUIRES_NEW)
	void deleteAllData()
	{
		// Delete in correct order to avoid foreign key violations
		// Delete junction table records first
		entityManager.createQuery("DELETE FROM TransactionTag").executeUpdate();
		entityManager.createQuery("DELETE FROM DocumentTag").executeUpdate();

		// Now safe to delete main entities
		transactionRepository.deleteAll();
		documentRepository.deleteAll();
		bommelRepository.deleteAll();
		tagRepository.deleteAll();
	}

	@Transactional(TxType.REQUIRES_NEW)
	TransactionRecord createTestTransaction(String name, String total)
	{
		TransactionRecord t = new TransactionRecord(
			new BigDecimal(total),
			DocumentType.RECEIPT,
			"test-user");
		t.setName(name);
		transactionRepository.persist(t);
		return t;
	}

	@Transactional(TxType.REQUIRES_NEW)
	Document createTestDocument(String name, String total)
	{
		Document d = new Document();
		d.setDocumentType(DocumentType.INVOICE);
		d.setName(name);
		d.setTotal(new BigDecimal(total));
		documentRepository.persist(d);
		return d;
	}

	@Transactional(TxType.REQUIRES_NEW)
	Document createTestDocumentWithAiTag(String name, String total, String tagName)
	{
		Document d = new Document();
		d.setDocumentType(DocumentType.INVOICE);
		d.setName(name);
		d.setTotal(new BigDecimal(total));

		Tag tag = new Tag();
		tag.setName(tagName);
		tagRepository.persist(tag);

		d.addTag(tag, app.hopps.document.domain.TagSource.AI);
		documentRepository.persist(d);
		return d;
	}

	@Transactional(TxType.REQUIRES_NEW)
	Bommel createTestBommel(String title)
	{
		Bommel b = new Bommel();
		b.setTitle(title);
		bommelRepository.persist(b);
		return b;
	}
}
