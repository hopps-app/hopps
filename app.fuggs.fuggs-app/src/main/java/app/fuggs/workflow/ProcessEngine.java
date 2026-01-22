package app.fuggs.workflow;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import app.fuggs.audit.domain.AuditLogEntry;
import app.fuggs.audit.repository.AuditLogRepository;
import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.security.OrganizationContext;
import app.fuggs.workflow.repository.WorkflowInstanceRepository;

/**
 * The ProcessEngine executes process definitions. It manages chain lifecycle
 * and coordinates task execution.
 *
 * Chains are persisted to the database to survive application restarts.
 */
@ApplicationScoped
public class ProcessEngine
{
	private static final Logger LOG = LoggerFactory.getLogger(ProcessEngine.class);

	@Inject
	AuditLogRepository auditLogRepository;

	@Inject
	WorkflowInstanceRepository chainRepository;

	@Inject
	OrganizationContext organizationContext;

	// Registry of process definitions by name (for recovery after restart)
	private final Map<String, ProcessDefinition> processRegistry = new HashMap<>();

	/**
	 * Registers a process definition so it can be retrieved later for resuming
	 * chains. This is necessary because ProcessDefinition contains CDI beans
	 * that cannot be serialized.
	 *
	 * @param process
	 *            the process definition to register
	 */
	public void registerProcess(ProcessDefinition process)
	{
		processRegistry.put(process.getName(), process);
		LOG.debug("Registered process definition: {}", process.getName());
	}

	/**
	 * Starts a new process instance.
	 *
	 * @param process
	 *            the process definition to execute
	 * @return the chain representing this process instance
	 */
	@Transactional
	public WorkflowInstance startProcess(ProcessDefinition process)
	{
		return startProcess(process, new HashMap<>());
	}

	/**
	 * Starts a new process instance with initial variables.
	 *
	 * @param process
	 *            the process definition to execute
	 * @param initialVariables
	 *            variables to initialize the chain with
	 * @return the chain representing this process instance
	 */
	@Transactional
	public WorkflowInstance startProcess(ProcessDefinition process, Map<String, Object> initialVariables)
	{
		Organization org = organizationContext.getCurrentOrganization();

		WorkflowInstance instance = new WorkflowInstance(process.getName());
		instance.setVariables(initialVariables);
		instance.setOrganization(org);

		// Register the process definition for later retrieval
		registerProcess(process);

		// Persist the chain BEFORE execution (ensures it exists in DB)
		chainRepository.persistAndFlush(instance);

		logAudit(instance, "ProcessStarted", "Started process: " + process.getName());

		// Execute tasks until waiting or complete
		executeUntilWaitingOrComplete(instance, process);

		return instance;
	}

	/**
	 * Completes a user task and resumes chain execution.
	 *
	 * @param workflowInstanceId
	 *            the chain ID
	 * @param userInput
	 *            the user's input data
	 * @param username
	 *            the user completing the task
	 * @return the updated chain
	 */
	@Transactional
	public WorkflowInstance completeUserTask(String workflowInstanceId, Map<String, Object> userInput, String username)
	{
		// Load chain from database
		WorkflowInstance instance = chainRepository.findById(workflowInstanceId);
		if (instance == null)
		{
			throw new IllegalArgumentException("WorkflowInstance not found: " + workflowInstanceId);
		}

		if (!instance.isWaitingForUser())
		{
			throw new IllegalStateException("WorkflowInstance is not waiting for user input");
		}

		// Look up process definition from registry
		ProcessDefinition process = processRegistry.get(instance.getProcessName());
		if (process == null)
		{
			throw new IllegalStateException(
				"Process definition not registered: " + instance.getProcessName());
		}

		Task currentTask = process.getTask(instance.getCurrentTaskIndex());

		if (!(currentTask instanceof UserTask userTask))
		{
			throw new IllegalStateException("Current task is not a UserTask");
		}

		// Complete the user task
		TaskResult result = userTask.complete(instance, userInput);

		logAudit(instance, currentTask.getTaskName(), "User task completed by: " + username, username);

		if (result == TaskResult.COMPLETED)
		{
			instance.incrementTaskIndex();
			executeUntilWaitingOrComplete(instance, process);
		}

		return instance;
	}

	/**
	 * Gets a chain by its ID from the database.
	 */
	public WorkflowInstance getChain(String workflowInstanceId)
	{
		return chainRepository.findById(workflowInstanceId);
	}

	/**
	 * Executes tasks until a UserTask is encountered or process completes.
	 * Persists chain state after each task execution for crash recovery.
	 */
	private void executeUntilWaitingOrComplete(WorkflowInstance instance, ProcessDefinition process)
	{
		while (instance.getStatus() == WorkflowStatus.RUNNING || instance.getStatus() == WorkflowStatus.WAITING)
		{
			// Check if we've completed all tasks
			if (instance.getCurrentTaskIndex() >= process.getTaskCount())
			{
				instance.setStatus(WorkflowStatus.COMPLETED);
				logAudit(instance, "ProcessCompleted", "Process completed successfully");
				chainRepository.persist(instance);
				chainRepository.flush();
				break;
			}

			Task task = process.getTask(instance.getCurrentTaskIndex());

			// Execute the task
			TaskResult result = task.execute(instance);

			logAudit(instance, task.getTaskName(), "Task executed with result: " + result);

			switch (result)
			{
				case COMPLETED:
					instance.incrementTaskIndex();
					instance.setStatus(WorkflowStatus.RUNNING);
					// Persist after each task for crash recovery
					chainRepository.persist(instance);
					chainRepository.flush();
					break;
				case WAITING:
					// UserTask - persist and stop execution
					chainRepository.persist(instance);
					chainRepository.flush();
					return;
				case FAILED:
					// Error occurred - persist failure state
					logAudit(instance, task.getTaskName(), "Task failed: " + instance.getError());
					chainRepository.persist(instance);
					chainRepository.flush();
					return;
			}
		}
	}

	private void logAudit(WorkflowInstance instance, String taskName, String details)
	{
		logAudit(instance, taskName, details, "system");
	}

	private void logAudit(WorkflowInstance instance, String taskName, String details, String username)
	{
		Organization org = organizationContext.getCurrentOrganization();

		AuditLogEntry entry = new AuditLogEntry();
		entry.setEntityName("WorkflowInstance");
		entry.setEntityId(instance.getId());
		entry.setTaskName(taskName);
		entry.setDetails(details);
		entry.setUsername(username);
		entry.setOrganization(org);
		auditLogRepository.persist(entry);
	}
}
