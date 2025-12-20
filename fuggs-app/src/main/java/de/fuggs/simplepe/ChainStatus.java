package de.fuggs.simplepe;

/**
 * Status of a process chain.
 */
public enum ChainStatus
{
	/**
	 * Chain is actively executing tasks.
	 */
	RUNNING,

	/**
	 * Chain is waiting for user input on a UserTask.
	 */
	WAITING,

	/**
	 * Chain has completed all tasks successfully.
	 */
	COMPLETED,

	/**
	 * Chain execution failed due to an error.
	 */
	FAILED
}
