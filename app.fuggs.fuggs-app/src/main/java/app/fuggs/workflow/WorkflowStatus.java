package app.fuggs.workflow;

/**
 * Status of a workflow instance.
 */
public enum WorkflowStatus
{
	/**
	 * Workflow is actively executing tasks.
	 */
	RUNNING,

	/**
	 * Workflow is waiting for user input on a UserTask.
	 */
	WAITING,

	/**
	 * Workflow has completed all tasks successfully.
	 */
	COMPLETED,

	/**
	 * Workflow execution failed due to an error.
	 */
	FAILED
}
