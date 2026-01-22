package app.fuggs.workflow.repository;

import java.util.List;

import app.fuggs.shared.security.OrganizationContext;
import app.fuggs.workflow.WorkflowInstance;
import app.fuggs.workflow.WorkflowStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Repository for WorkflowInstance (process instance) persistence.
 */
@ApplicationScoped
public class WorkflowInstanceRepository implements PanacheRepositoryBase<WorkflowInstance, String>
{
	@Inject
	OrganizationContext organizationContext;

	/**
	 * Find all workflow instances with a specific status within the current
	 * organization. Useful for recovery - e.g., find all RUNNING instances
	 * (crashed), all WAITING instances (resumable).
	 *
	 * @param status
	 *            The workflow status
	 * @return List of workflow instances
	 */
	public List<WorkflowInstance> findByStatusInCurrentOrg(WorkflowStatus status)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return list("status = ?1 and organization.id = ?2", status, orgId);
	}

	public List<WorkflowInstance> findByStatusInApplicationScope(WorkflowStatus status)
	{
		return list("status = ?1 ", status);
	}

	/**
	 * Find all workflow instances for a specific process definition within the
	 * current organization. Useful for debugging and monitoring.
	 *
	 * @param processName
	 *            The process name
	 * @return List of workflow instances
	 */
	public List<WorkflowInstance> findByProcessName(String processName)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return list("processName = ?1 and organization.id = ?2", processName, orgId);
	}

	/**
	 * Find all workflow instances waiting for user input (WAITING status)
	 * within the current organization. These instances are safe to resume after
	 * application restart.
	 *
	 * @return List of waiting workflow instances
	 */
	public List<WorkflowInstance> findWaitingChains()
	{
		return findByStatusInCurrentOrg(WorkflowStatus.WAITING);
	}

	/**
	 * Find all active workflow instances (RUNNING or WAITING) within the
	 * current organization. These instances are in progress and not yet
	 * completed or failed.
	 *
	 * @return List of active workflow instances
	 */
	public List<WorkflowInstance> findActiveChains()
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return List.of();
		}
		return list("status in ?1 and organization.id = ?2",
			List.of(WorkflowStatus.RUNNING, WorkflowStatus.WAITING), orgId);
	}

	/**
	 * Finds a workflow instance by ID, scoped to the current organization. This
	 * prevents cross-organization access.
	 *
	 * @param id
	 *            The workflow instance ID
	 * @return The workflow instance, or null if not found or not in current
	 *         organization
	 */
	public WorkflowInstance findByIdScoped(String id)
	{
		Long orgId = organizationContext.getCurrentOrganizationId();
		if (orgId == null)
		{
			return null;
		}
		return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
	}
}
