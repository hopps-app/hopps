package app.fuggs.workflow;

import java.util.Map;

/**
 * Abstract base class for user tasks. User tasks require human interaction to
 * complete. When executed, they put the chain in a waiting state until a user
 * completes the task.
 * <p>
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
	 * Completes the user task associated with the given workflow instance by
	 * validating and processing user input. If the input validation fails or an
	 * exception occurs during processing, the task is marked as failed. On
	 * successful completion, the waiting state and associated user task
	 * information are cleared, and the task is marked as completed.
	 *
	 * @param instance
	 *            the workflow instance representing the current state of the
	 *            execution
	 * @param userInput
	 *            a map of user-provided input values to be validated and
	 *            processed
	 * @return {@code TaskResult.COMPLETED} if the task is successfully
	 *         completed, {@code TaskResult.FAILED} if the task fails during
	 *         validation or processing
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
	 * Validates the user-provided input for the associated workflow instance.
	 * This method is intended to be overridden by subclasses to implement
	 * specific input validation logic.
	 *
	 * @param instance
	 *            the workflow instance representing the current state of the
	 *            execution. This parameter must not be null.
	 * @param userInput
	 *            a map of user-provided input values to be validated. This map
	 *            may include key-value pairs representing specific user inputs.
	 * @return {@code true} if the input is valid; otherwise, {@code false}.
	 */
	protected boolean validateInput(WorkflowInstance instance, Map<String, Object> userInput)
	{
		return true;
	}

	/**
	 * Processes user input for the given workflow instance. This method is
	 * intended to be implemented by subclasses to define the specific logic for
	 * handling and processing user-provided input.
	 *
	 * @param instance
	 *            the workflow instance representing the current state of
	 *            execution. This object contains all the workflow data and
	 *            execution context. Must not be null.
	 * @param userInput
	 *            a map of key-value pairs representing inputs provided by the
	 *            user. The keys are expected to correspond to specific input
	 *            fields or parameters required by the user task. The values
	 *            contain the user-specified data for those fields. This
	 *            parameter must not be null but may contain an empty map if no
	 *            input is provided.
	 */
	protected abstract void processInput(WorkflowInstance instance, Map<String, Object> userInput);
}
