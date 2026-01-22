package app.fuggs.workflow;

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
	 * Executes the task logic associated with the given workflow instance. This
	 * method is responsible for performing the specific operations defined by
	 * the task and updating the state of the workflow instance as necessary.
	 * The result of the execution determines the next step in the workflow
	 * process.
	 *
	 * @param instance
	 *            the WorkflowInstance containing the current state and context
	 *            of the workflow execution. This parameter must not be null.
	 * @return the result of the task execution, represented by a
	 *         {@link TaskResult}. Possible values are: - {@code COMPLETED}: If
	 *         the task executes successfully and the workflow should proceed to
	 *         the next step. - {@code WAITING}: If the task requires external
	 *         input, causing the workflow to pause execution. - {@code FAILED}:
	 *         If the task encounters an error, halting the workflow.
	 */
	TaskResult execute(WorkflowInstance instance);
}
