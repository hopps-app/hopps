package app.hopps.workflow;

/**
 * Base interface for all tasks in the process engine. Tasks are stateless and
 * injectable - all state is held in the Chain.
 */
public interface Task
{
	/**
	 * Returns the name of this task for logging and identification.
	 */
	String getTaskName();

	/**
	 * Executes the task with the given chain context.
	 *
	 * @param chain
	 *            the process chain holding all state
	 * @return the result of execution
	 */
	TaskResult execute(WorkflowInstance instance);
}
