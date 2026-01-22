package app.fuggs.transaction.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import app.fuggs.bommel.domain.Bommel;
import app.fuggs.bommel.repository.BommelRepository;
import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.BaseOrganizationTest;
import app.fuggs.shared.TestSecurityHelper;
import app.fuggs.transaction.domain.TransactionRecord;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@QuarkusTest
@TestSecurity(user = TestSecurityHelper.TEST_USER_MARIA, roles = "user")
class TransactionRecordRepositoryTest extends BaseOrganizationTest
{
	@Inject
	TransactionRecordRepository repository;

	@Inject
	BommelRepository bommelRepository;

	@BeforeEach
	void setupOrganizationContext()
	{
		Organization testOrg = getOrCreateTestOrganization();
		createTestMember(TestSecurityHelper.TEST_USER_MARIA, testOrg);
	}

	@BeforeEach
	@Transactional(Transactional.TxType.REQUIRES_NEW)
	void cleanup()
	{
		repository.deleteAll();
		bommelRepository.deleteAll();
	}

	@TestTransaction
	@Test
	void shouldFindByBommel()
	{
		Organization org = getOrCreateTestOrganization();

		Bommel bommel = createBommel("Test Bommel", org);

		TransactionRecord t1 = createTransaction("T1", bommel, org);
		TransactionRecord t2 = createTransaction("T2", bommel, org);
		TransactionRecord t3 = createTransaction("T3", null, org);

		repository.persist(t1);
		repository.persist(t2);
		repository.persist(t3);

		List<TransactionRecord> found = repository.findByBommel(bommel.getId());

		assertEquals(2, found.size());
	}

	@TestTransaction
	@Test
	void shouldFindUnassigned()
	{
		Organization org = getOrCreateTestOrganization();

		Bommel bommel = createBommel("Assigned Bommel", org);

		TransactionRecord assigned = createTransaction("Assigned", bommel, org);
		TransactionRecord unassigned1 = createTransaction("Unassigned 1", null, org);
		TransactionRecord unassigned2 = createTransaction("Unassigned 2", null, org);

		repository.persist(assigned);
		repository.persist(unassigned1);
		repository.persist(unassigned2);

		List<TransactionRecord> found = repository.findUnassigned();

		assertEquals(2, found.size());
	}

	@TestTransaction
	@Test
	void shouldFindAllOrderedByDate()
	{
		Organization org = getOrCreateTestOrganization();

		TransactionRecord t1 = createTransaction("Transaction 1", null, org);
		TransactionRecord t2 = createTransaction("Transaction 2", null, org);
		TransactionRecord t3 = createTransaction("Transaction 3", null, org);

		repository.persist(t1);
		repository.persist(t2);
		repository.persist(t3);

		List<TransactionRecord> found = repository.findAllOrderedByDate();

		assertEquals(3, found.size());
	}

	private Bommel createBommel(String title, Organization org)
	{
		Bommel bommel = new Bommel();
		bommel.setTitle(title);
		bommel.setIcon("folder");
		bommel.setOrganization(org);
		bommelRepository.persist(bommel);
		return bommel;
	}

	private TransactionRecord createTransaction(String name, Bommel bommel, Organization org)
	{
		TransactionRecord transaction = new TransactionRecord();
		transaction.setName(name);
		transaction.setTotal(BigDecimal.TEN);
		transaction.setUploader("test@example.com");
		transaction.setBommel(bommel);
		transaction.setOrganization(org);
		return transaction;
	}
}
