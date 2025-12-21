package app.hopps.simplepe;

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
	public final TaskResult execute(Chain chain)
	{
		LOG.debug("Executing system task: {} for chain: {}", getTaskName(), chain.getId());

		try
		{
			doExecute(chain);
			LOG.debug("System task completed successfully: {} for chain: {}", getTaskName(), chain.getId());
			return TaskResult.COMPLETED;
		}
		catch (Exception e)
		{
			LOG.error("System task failed: {} for chain: {}, error: {}",
				getTaskName(), chain.getId(), e.getMessage(), e);
			chain.setError(e.getMessage());
			return TaskResult.FAILED;
		}
	}

	/**
	 * Implement this method to perform the system task logic. All state should
	 * be read from and written to the chain.
	 *
	 * @param chain
	 *            the process chain holding all state
	 */
	protected abstract void doExecute(Chain chain);
}
