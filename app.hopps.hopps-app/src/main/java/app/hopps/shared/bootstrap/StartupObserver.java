package app.hopps.shared.bootstrap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

/**
 * Observes application startup and triggers the bootstrap process.
 */
@ApplicationScoped
public class StartupObserver
{
	private static final Logger LOG = LoggerFactory.getLogger(StartupObserver.class);

	@Inject
	BootstrapService bootstrapService;

	/**
	 * Called when the application starts. Triggers the bootstrap process to
	 * ensure the system has the necessary initial data.
	 *
	 * @param event
	 *            The startup event
	 */
	void onStart(@Observes StartupEvent event)
	{
		LOG.info("Application starting - running bootstrap...");
		try
		{
			bootstrapService.bootstrap();
		}
		catch (Exception e)
		{
			LOG.error("Bootstrap failed during startup", e);
			// Don't prevent app startup, but log the error
		}
	}
}
