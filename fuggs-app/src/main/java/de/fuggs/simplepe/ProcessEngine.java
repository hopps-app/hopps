package de.fuggs.simplepe;

import java.util.HashMap;
import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import model.AuditLogEntry;
import repository.AuditLogRepository;

/**
 * The ProcessEngine executes process definitions. It manages chain lifecycle
 * and coordinates task execution.
 */
@ApplicationScoped
public class ProcessEngine
{
	@Inject
	AuditLogRepository auditLogRepository;

	// In-memory storage for active chains (in production, persist to DB)
	private final Map<String, Chain> activeChains = new HashMap<>();
	private final Map<String, ProcessDefinition> chainProcesses = new HashMap<>();

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

		activeChains.put(chain.getId(), chain);
		chainProcesses.put(chain.getId(), process);

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
		Chain chain = activeChains.get(chainId);
		if (chain == null)
		{
			throw new IllegalArgumentException("Chain not found: " + chainId);
		}

		if (!chain.isWaitingForUser())
		{
			throw new IllegalStateException("Chain is not waiting for user input");
		}

		ProcessDefinition process = chainProcesses.get(chainId);
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
	 * Gets a chain by its ID.
	 */
	public Chain getChain(String chainId)
	{
		return activeChains.get(chainId);
	}

	/**
	 * Executes tasks until a UserTask is encountered or process completes.
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
					break;
				case WAITING:
					// UserTask - stop execution and wait
					return;
				case FAILED:
					// Error occurred
					logAudit(chain, task.getTaskName(), "Task failed: " + chain.getError());
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
		entry.entityName = "Chain";
		entry.entityId = chain.getId();
		entry.taskName = taskName;
		entry.details = details;
		entry.username = username;
		auditLogRepository.persist(entry);
	}
}
