package app.hopps.transaction.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.DocumentType;
import app.hopps.transaction.domain.TransactionRecord;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@QuarkusTest
class TransactionRecordRepositoryTest
{
	@Inject
	TransactionRecordRepository repository;

	@Inject
	BommelRepository bommelRepository;

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
		Bommel bommel = createBommel("Test Bommel");

		TransactionRecord t1 = createTransaction("T1", bommel);
		TransactionRecord t2 = createTransaction("T2", bommel);
		TransactionRecord t3 = createTransaction("T3", null);

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
		Bommel bommel = createBommel("Assigned Bommel");

		TransactionRecord assigned = createTransaction("Assigned", bommel);
		TransactionRecord unassigned1 = createTransaction("Unassigned 1", null);
		TransactionRecord unassigned2 = createTransaction("Unassigned 2", null);

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
		TransactionRecord t1 = createTransaction("Transaction 1", null);
		TransactionRecord t2 = createTransaction("Transaction 2", null);
		TransactionRecord t3 = createTransaction("Transaction 3", null);

		repository.persist(t1);
		repository.persist(t2);
		repository.persist(t3);

		List<TransactionRecord> found = repository.findAllOrderedByDate();

		assertEquals(3, found.size());
	}

	private Bommel createBommel(String title)
	{
		Bommel bommel = new Bommel();
		bommel.setTitle(title);
		bommel.setIcon("folder");
		bommelRepository.persist(bommel);
		return bommel;
	}

	private TransactionRecord createTransaction(String name, Bommel bommel)
	{
		TransactionRecord transaction = new TransactionRecord();
		transaction.setName(name);
		transaction.setDocumentType(DocumentType.RECEIPT);
		transaction.setTotal(BigDecimal.TEN);
		transaction.setUploader("test@example.com");
		transaction.setBommel(bommel);
		return transaction;
	}
}
