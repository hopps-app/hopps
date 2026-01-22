package app.fuggs.transaction.api;

import app.fuggs.bommel.repository.BommelRepository;
import app.fuggs.document.repository.DocumentRepository;
import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.BaseOrganizationTest;
import app.fuggs.shared.TestSecurityHelper;
import app.fuggs.shared.repository.TagRepository;
import app.fuggs.transaction.domain.TransactionRecord;
import app.fuggs.transaction.repository.TransactionRecordRepository;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.transaction.Transactional.TxType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;

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
		// Delete it in correct order to avoid foreign key violations
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
}
