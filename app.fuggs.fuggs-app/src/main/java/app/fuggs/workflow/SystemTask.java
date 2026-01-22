package app.fuggs.workflow;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Abstract base class for system tasks. System tasks are executed automatically
 * by the process engine. They run synchronously and complete immediately.
 *
 * Implementations should be CDI beans (e.g., @ApplicationScoped) so they can
 * have dependencies injected.
 */
public abstract class SystemTask implements Task
{
	private static final Logger LOG = LoggerFactory.getLogger(SystemTask.class);

	@Override
	public final TaskResult execute(WorkflowInstance instance)
	{
		LOG.debug("Executing system task: {} for chain: {}", getTaskName(), instance.getId());

		try
		{
			doExecute(instance);
			LOG.debug("System task completed successfully: {} for chain: {}", getTaskName(), instance.getId());
			return TaskResult.COMPLETED;
		}
		catch (Exception e)
		{
			LOG.error("System task failed: {} for chain: {}, error: {}",
				getTaskName(), instance.getId(), e.getMessage(), e);
			instance.setError(e.getMessage());
			return TaskResult.FAILED;
		}
	}

	/**
	 * Executes the logic specific to the system task. This method is called by
	 * the {@link SystemTask#execute(WorkflowInstance)} method and encapsulates
	 * the task's core functionality.
	 * <p>
	 * Implementations of this method should perform the necessary actions for
	 * the system task and may update the state of the provided
	 * {@code WorkflowInstance}. In case of an error during execution,
	 * implementations can throw exceptions that will be captured and handled by
	 * the {@code execute} method.
	 *
	 * @param instance
	 *            the {@link WorkflowInstance} representing the workflow state
	 *            and context in which this system task is executed
	 */
	protected abstract void doExecute(WorkflowInstance instance);
}
