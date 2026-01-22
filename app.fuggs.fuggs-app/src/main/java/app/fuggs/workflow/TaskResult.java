package app.fuggs.workflow;

/**
 * Result of task execution.
 */
public enum TaskResult
{
	/**
	 * Task completed successfully, proceed to next task.
	 */
	COMPLETED,

	/**
	 * Task is waiting for external input (e.g., user action). WorkflowInstance
	 * execution pauses until resumed.
	 */
	WAITING,

	/**
	 * Task failed, chain execution stops.
	 */
	FAILED
}
