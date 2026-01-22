package app.fuggs.transaction.repository;

import java.util.List;

import app.fuggs.shared.security.OrganizationContext;
import app.fuggs.transaction.domain.TransactionRecord;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class TransactionRecordRepository implements PanacheRepository<TransactionRecord>
{
	@Inject
	OrganizationContext organizationContext;

	/**
	 * Find all transaction records for the current organization, ordered by
	 * transaction time (newest first). Uses LEFT JOIN FETCH to prevent N+1
	 * queries for tags.
	 */
	public List<TransactionRecord> findAllOrderedByDate()
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return find("SELECT DISTINCT t FROM TransactionRecord t " +
			"LEFT JOIN FETCH t.transactionTags " +
			"WHERE t.organization.id = ?1 " +
			"ORDER BY t.transactionTime DESC, t.createdAt DESC",
			orgId)
				.list();
	}

	/**
	 * Find transaction records assigned to a specific Bommel within the current
	 * organization. Uses LEFT JOIN FETCH to prevent N+1 queries for tags.
	 */
	public List<TransactionRecord> findByBommel(Long bommelId)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return find("SELECT DISTINCT t FROM TransactionRecord t " +
			"LEFT JOIN FETCH t.transactionTags " +
			"WHERE t.bommel.id = ?1 AND t.organization.id = ?2 " +
			"ORDER BY t.transactionTime DESC",
			bommelId, orgId)
				.list();
	}

	/**
	 * Find transaction records not assigned to any Bommel within the current
	 * organization. Uses LEFT JOIN FETCH to prevent N+1 queries for tags.
	 */
	public List<TransactionRecord> findUnassigned()
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return find("SELECT DISTINCT t FROM TransactionRecord t " +
			"LEFT JOIN FETCH t.transactionTags " +
			"WHERE t.bommel IS NULL AND t.organization.id = ?1 " +
			"ORDER BY t.createdAt DESC",
			orgId)
				.list();
	}

	/**
	 * Find transaction records linked to a specific document within the current
	 * organization.
	 */
	public List<TransactionRecord> findByDocument(Long documentId)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return find("document.id = ?1 AND organization.id = ?2 ORDER BY createdAt DESC",
			documentId, orgId)
				.list();
	}

	/**
	 * Finds a transaction record by ID, scoped to the current organization.
	 * This prevents cross-organization access.
	 *
	 * @param id
	 *            The transaction record ID
	 * @return The transaction record, or null if not found or not in current
	 *         organization
	 */
	public TransactionRecord findByIdScoped(Long id)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return null;
		}
		return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
	}
}
