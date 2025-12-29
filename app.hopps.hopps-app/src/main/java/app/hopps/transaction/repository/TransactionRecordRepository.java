package app.hopps.transaction.repository;

import java.util.List;

import app.hopps.transaction.domain.TransactionRecord;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class TransactionRecordRepository implements PanacheRepository<TransactionRecord>
{
	/**
	 * Find all transaction records ordered by transaction time (newest first).
	 * Uses LEFT JOIN FETCH to prevent N+1 queries for tags.
	 */
	public List<TransactionRecord> findAllOrderedByDate()
	{
		return find("SELECT DISTINCT t FROM TransactionRecord t " +
			"LEFT JOIN FETCH t.transactionTags " +
			"ORDER BY t.transactionTime DESC, t.createdAt DESC")
				.list();
	}

	/**
	 * Find transaction records assigned to a specific Bommel. Uses LEFT JOIN
	 * FETCH to prevent N+1 queries for tags.
	 */
	public List<TransactionRecord> findByBommel(Long bommelId)
	{
		return find("SELECT DISTINCT t FROM TransactionRecord t " +
			"LEFT JOIN FETCH t.transactionTags " +
			"WHERE t.bommel.id = ?1 " +
			"ORDER BY t.transactionTime DESC",
			bommelId)
				.list();
	}

	/**
	 * Find transaction records not assigned to any Bommel. Uses LEFT JOIN FETCH
	 * to prevent N+1 queries for tags.
	 */
	public List<TransactionRecord> findUnassigned()
	{
		return find("SELECT DISTINCT t FROM TransactionRecord t " +
			"LEFT JOIN FETCH t.transactionTags " +
			"WHERE t.bommel IS NULL " +
			"ORDER BY t.createdAt DESC")
				.list();
	}

	/**
	 * Find transaction records linked to a specific document.
	 */
	public List<TransactionRecord> findByDocument(Long documentId)
	{
		return find("document.id = ?1 ORDER BY createdAt DESC", documentId)
			.list();
	}
}
