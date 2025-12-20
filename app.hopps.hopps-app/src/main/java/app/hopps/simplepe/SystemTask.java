package app.hopps.simplepe;

/**
 * Abstract base class for system tasks. System tasks are executed automatically
 * by the process engine. They run synchronously and complete immediately.
 *
 * Implementations should be CDI beans (e.g., @ApplicationScoped) so they can
 * have dependencies injected.
 */
public abstract class SystemTask implements Task
{
	@Override
	public final TaskResult execute(Chain chain)
	{
		try
		{
			doExecute(chain);
			return TaskResult.COMPLETED;
		}
		catch (Exception e)
		{
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
