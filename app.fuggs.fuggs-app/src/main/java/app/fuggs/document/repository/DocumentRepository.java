package app.fuggs.document.repository;

import java.util.List;

import app.fuggs.document.domain.Document;
import app.fuggs.shared.security.OrganizationContext;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class DocumentRepository implements PanacheRepository<Document>
{
	@Inject
	OrganizationContext organizationContext;

	/**
	 * Finds all documents for the current organization, ordered by date.
	 *
	 * @return List of documents in the current organization
	 */
	public List<Document> findAllOrderedByDate()
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return find(
			"SELECT DISTINCT d FROM Document d LEFT JOIN FETCH d.documentTags WHERE d.organization.id = ?1 ORDER BY d.transactionTime DESC, d.createdAt DESC",
			orgId).list();
	}

	/**
	 * Finds all documents for a specific bommel within the current
	 * organization.
	 *
	 * @param bommelId
	 *            The bommel ID
	 * @return List of documents for the bommel
	 */
	public List<Document> findByBommelId(Long bommelId)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return find(
			"SELECT DISTINCT d FROM Document d LEFT JOIN FETCH d.documentTags WHERE d.bommel.id = ?1 AND d.organization.id = ?2 ORDER BY d.transactionTime DESC",
			bommelId, orgId).list();
	}

	/**
	 * Finds all unassigned documents (no bommel) within the current
	 * organization.
	 *
	 * @return List of unassigned documents
	 */
	public List<Document> findUnassigned()
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return find("bommel IS NULL AND organization.id = ?1 ORDER BY createdAt DESC", orgId).list();
	}

	/**
	 * Finds a document by ID, scoped to the current organization. This prevents
	 * cross-organization access.
	 *
	 * @param id
	 *            The document ID
	 * @return The document, or null if not found or not in current organization
	 */
	public Document findByIdScoped(Long id)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return null;
		}
		return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
	}
}
