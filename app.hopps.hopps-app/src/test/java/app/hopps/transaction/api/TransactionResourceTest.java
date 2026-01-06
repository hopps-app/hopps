package app.hopps.transaction.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.Document;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.BaseOrganizationTest;
import app.hopps.shared.TestSecurityHelper;
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
@TestSecurity(user = TestSecurityHelper.TEST_USER_MARIA, roles = "user")
class TransactionResourceTest extends BaseOrganizationTest
{
	@BeforeEach
	void setupOrganizationContext()
	{
		Organization testOrg = getOrCreateTestOrganization();
		createTestMember(TestSecurityHelper.TEST_USER_MARIA, testOrg);
	}

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
	void shouldShowCreateTransactionForm()
	{
		given()
			.when().get("/transaktionen/neu")
			.then()
			.statusCode(200)
			.body(containsString("total"))
			.body(containsString("Transaktion erstellen"));
	}

	@Test
	void shouldShowUpdateFormFields()
	{
		deleteAllData();
		TransactionRecord transaction = createTestTransaction("Test Transaction", "100.00");

		given()
			.when().get("/transaktionen/" + transaction.getId())
			.then()
			.statusCode(200)
			.body(containsString("Test Transaction"))
			.body(containsString("update"));
	}

	@Test
	void shouldShowDeleteButton()
	{
		deleteAllData();
		TransactionRecord transaction = createTestTransaction("To Delete", "50.00");

		given()
			.when().get("/transaktionen/" + transaction.getId())
			.then()
			.statusCode(200)
			.body(containsString("delete"));
	}

	@Test
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
		Organization org = getOrCreateTestOrganization();

		TransactionRecord t = new TransactionRecord(
			new BigDecimal(total),
			"test-user");
		t.setName(name);
		t.setOrganization(org);
		transactionRepository.persist(t);
		return t;
	}

	@Transactional(TxType.REQUIRES_NEW)
	Document createTestDocument(String name, String total)
	{
		Organization org = getOrCreateTestOrganization();

		Document d = new Document();
		d.setName(name);
		d.setTotal(new BigDecimal(total));
		d.setOrganization(org);
		documentRepository.persist(d);
		return d;
	}

	@Transactional(TxType.REQUIRES_NEW)
	Document createTestDocumentWithAiTag(String name, String total, String tagName)
	{
		Organization org = getOrCreateTestOrganization();

		Document d = new Document();
		d.setName(name);
		d.setTotal(new BigDecimal(total));
		d.setOrganization(org);

		Tag tag = new Tag();
		tag.setName(tagName);
		tag.setOrganization(org);
		tagRepository.persist(tag);

		d.addTag(tag, app.hopps.document.domain.TagSource.AI);
		documentRepository.persist(d);
		return d;
	}

	@Transactional(TxType.REQUIRES_NEW)
	Bommel createTestBommel(String title)
	{
		Organization org = getOrCreateTestOrganization();

		Bommel b = new Bommel();
		b.setTitle(title);
		b.setOrganization(org);
		bommelRepository.persist(b);
		return b;
	}
}
