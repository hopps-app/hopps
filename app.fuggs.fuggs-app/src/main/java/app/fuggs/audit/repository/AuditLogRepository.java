package app.fuggs.audit.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import app.fuggs.shared.security.OrganizationContext;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import app.fuggs.audit.domain.AuditLogEntry;

@ApplicationScoped
public class AuditLogRepository implements PanacheRepositoryBase<AuditLogEntry, Long>
{
	@Inject
	OrganizationContext organizationContext;

	/**
	 * Finds audit log entries by entity ID within the current organization.
	 *
	 * @param entityId
	 *            The entity ID
	 * @return List of audit log entries
	 */
	public List<AuditLogEntry> findByEntityId(String entityId)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return list("entityId = ?1 and organization.id = ?2", entityId, orgId);
	}

	/**
	 * Finds audit log entries by entity name within the current organization.
	 *
	 * @param entityName
	 *            The entity name
	 * @return List of audit log entries
	 */
	public List<AuditLogEntry> findByEntityName(String entityName)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return list("entityName = ?1 and organization.id = ?2", entityName, orgId);
	}

	/**
	 * Finds audit log entries by username within the current organization.
	 *
	 * @param username
	 *            The username
	 * @return List of audit log entries
	 */
	public List<AuditLogEntry> findByUsername(String username)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return list("username = ?1 and organization.id = ?2", username, orgId);
	}

	/**
	 * Finds audit log entries for a workflow instance within the current
	 * organization.
	 *
	 * @param workflowInstanceId
	 *            The workflow instance ID
	 * @return List of audit log entries
	 */
	public List<AuditLogEntry> findByWorkflowInstanceId(String workflowInstanceId)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return list("entityName = ?1 and entityId = ?2 and organization.id = ?3",
			"WorkflowInstance", workflowInstanceId, orgId);
	}

	/**
	 * Finds an audit log entry by ID, scoped to the current organization. This
	 * prevents cross-organization access.
	 *
	 * @param id
	 *            The audit log entry ID
	 * @return The audit log entry, or null if not found or not in current
	 *         organization
	 */
	public AuditLogEntry findByIdScoped(Long id)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return null;
		}
		return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
	}
}
