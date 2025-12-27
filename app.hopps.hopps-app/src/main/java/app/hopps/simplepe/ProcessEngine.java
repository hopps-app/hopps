package app.hopps.simplepe;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import app.hopps.audit.domain.AuditLogEntry;
import app.hopps.audit.repository.AuditLogRepository;
import app.hopps.simplepe.repository.ChainRepository;

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
	ChainRepository chainRepository;

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
	public Chain startProcess(ProcessDefinition process)
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
	public Chain startProcess(ProcessDefinition process, Map<String, Object> initialVariables)
	{
		Chain chain = new Chain(process.getName());
		chain.setVariables(initialVariables);

		// Register the process definition for later retrieval
		registerProcess(process);

		// Persist the chain BEFORE execution (ensures it exists in DB)
		chainRepository.persistAndFlush(chain);

		logAudit(chain, "ProcessStarted", "Started process: " + process.getName());

		// Execute tasks until waiting or complete
		executeUntilWaitingOrComplete(chain, process);

		return chain;
	}

	/**
	 * Completes a user task and resumes chain execution.
	 *
	 * @param chainId
	 *            the chain ID
	 * @param userInput
	 *            the user's input data
	 * @param username
	 *            the user completing the task
	 * @return the updated chain
	 */
	@Transactional
	public Chain completeUserTask(String chainId, Map<String, Object> userInput, String username)
	{
		// Load chain from database
		Chain chain = chainRepository.findById(chainId);
		if (chain == null)
		{
			throw new IllegalArgumentException("Chain not found: " + chainId);
		}

		if (!chain.isWaitingForUser())
		{
			throw new IllegalStateException("Chain is not waiting for user input");
		}

		// Look up process definition from registry
		ProcessDefinition process = processRegistry.get(chain.getProcessName());
		if (process == null)
		{
			throw new IllegalStateException(
				"Process definition not registered: " + chain.getProcessName());
		}

		Task currentTask = process.getTask(chain.getCurrentTaskIndex());

		if (!(currentTask instanceof UserTask userTask))
		{
			throw new IllegalStateException("Current task is not a UserTask");
		}

		// Complete the user task
		TaskResult result = userTask.complete(chain, userInput);

		logAudit(chain, currentTask.getTaskName(), "User task completed by: " + username, username);

		if (result == TaskResult.COMPLETED)
		{
			chain.incrementTaskIndex();
			executeUntilWaitingOrComplete(chain, process);
		}

		return chain;
	}

	/**
	 * Gets a chain by its ID from the database.
	 */
	public Chain getChain(String chainId)
	{
		return chainRepository.findById(chainId);
	}

	/**
	 * Executes tasks until a UserTask is encountered or process completes.
	 * Persists chain state after each task execution for crash recovery.
	 */
	private void executeUntilWaitingOrComplete(Chain chain, ProcessDefinition process)
	{
		while (chain.getStatus() == ChainStatus.RUNNING || chain.getStatus() == ChainStatus.WAITING)
		{
			// Check if we've completed all tasks
			if (chain.getCurrentTaskIndex() >= process.getTaskCount())
			{
				chain.setStatus(ChainStatus.COMPLETED);
				logAudit(chain, "ProcessCompleted", "Process completed successfully");
				chainRepository.persist(chain);
				chainRepository.flush();
				break;
			}

			Task task = process.getTask(chain.getCurrentTaskIndex());

			// Execute the task
			TaskResult result = task.execute(chain);

			logAudit(chain, task.getTaskName(), "Task executed with result: " + result);

			switch (result)
			{
				case COMPLETED:
					chain.incrementTaskIndex();
					chain.setStatus(ChainStatus.RUNNING);
					// Persist after each task for crash recovery
					chainRepository.persist(chain);
					chainRepository.flush();
					break;
				case WAITING:
					// UserTask - persist and stop execution
					chainRepository.persist(chain);
					chainRepository.flush();
					return;
				case FAILED:
					// Error occurred - persist failure state
					logAudit(chain, task.getTaskName(), "Task failed: " + chain.getError());
					chainRepository.persist(chain);
					chainRepository.flush();
					return;
			}
		}
	}

	private void logAudit(Chain chain, String taskName, String details)
	{
		logAudit(chain, taskName, details, "system");
	}

	private void logAudit(Chain chain, String taskName, String details, String username)
	{
		AuditLogEntry entry = new AuditLogEntry();
		entry.setEntityName("Chain");
		entry.setEntityId(chain.getId());
		entry.setTaskName(taskName);
		entry.setDetails(details);
		entry.setUsername(username);
		auditLogRepository.persist(entry);
	}
}
