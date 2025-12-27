package app.hopps.workflow.repository;

import java.util.List;

import app.hopps.workflow.WorkflowInstance;
import app.hopps.workflow.WorkflowStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Repository for WorkflowInstance (process instance) persistence.
 */
@ApplicationScoped
public class WorkflowInstanceRepository implements PanacheRepositoryBase<WorkflowInstance, String>
{
	/**
	 * Find all workflow instances with a specific status. Useful for recovery -
	 * e.g., find all RUNNING instances (crashed), all WAITING instances
	 * (resumable).
	 */
	public List<WorkflowInstance> findByStatus(WorkflowStatus status)
	{
		return list("status", status);
	}

	/**
	 * Find all workflow instances for a specific process definition. Useful for
	 * debugging and monitoring.
	 */
	public List<WorkflowInstance> findByProcessName(String processName)
	{
		return list("processName", processName);
	}

	/**
	 * Find all workflow instances waiting for user input (WAITING status).
	 * These instances are safe to resume after application restart.
	 */
	public List<WorkflowInstance> findWaitingChains()
	{
		return findByStatus(WorkflowStatus.WAITING);
	}

	/**
	 * Find all active workflow instances (RUNNING or WAITING). These instances
	 * are in progress and not yet completed or failed.
	 */
	public List<WorkflowInstance> findActiveChains()
	{
		return list("status in ?1", List.of(WorkflowStatus.RUNNING, WorkflowStatus.WAITING));
	}
}
