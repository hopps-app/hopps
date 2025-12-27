package app.hopps.workflow;

import java.util.Map;

/**
 * Abstract base class for user tasks. User tasks require human interaction to
 * complete. When executed, they put the chain in a waiting state until a user
 * completes the task.
 *
 * Implementations should be CDI beans (e.g., @ApplicationScoped) so they can
 * have dependencies injected.
 */
public abstract class UserTask implements Task
{
	@Override
	public final TaskResult execute(WorkflowInstance instance)
	{
		// Store information about this user task in the chain
		instance.setWaitingForUser(true);
		instance.setCurrentUserTask(getTaskName());
		return TaskResult.WAITING;
	}

	/**
	 * Called when a user completes this task with input data.
	 *
	 * @param chain
	 *            the process chain holding all state
	 * @param userInput
	 *            the data provided by the user
	 * @return COMPLETED if successful, FAILED if validation fails
	 */
	public final TaskResult complete(WorkflowInstance instance, Map<String, Object> userInput)
	{
		try
		{
			// Validate and process user input
			if (!validateInput(instance, userInput))
			{
				return TaskResult.FAILED;
			}

			// Process the user input
			processInput(instance, userInput);

			// Clear waiting state
			instance.setWaitingForUser(false);
			instance.setCurrentUserTask(null);

			return TaskResult.COMPLETED;
		}
		catch (Exception e)
		{
			instance.setError(e.getMessage());
			return TaskResult.FAILED;
		}
	}

	/**
	 * Validates the user input before processing. Override to add custom
	 * validation logic.
	 *
	 * @param chain
	 *            the process chain
	 * @param userInput
	 *            the input to validate
	 * @return true if valid, false otherwise
	 */
	protected boolean validateInput(WorkflowInstance instance, Map<String, Object> userInput)
	{
		return true;
	}

	/**
	 * Processes the validated user input. Implementations should store results
	 * in the instance.
	 *
	 * @param chain
	 *            the process chain
	 * @param userInput
	 *            the validated user input
	 */
	protected abstract void processInput(WorkflowInstance instance, Map<String, Object> userInput);

	/**
	 * Returns the assignee for this user task, if any. Override to assign tasks
	 * to specific users or roles.
	 *
	 * @param chain
	 *            the process chain
	 * @return the assignee username, or null for unassigned
	 */
	public String getAssignee(WorkflowInstance instance)
	{
		return null;
	}
}
