package app.fuggs.shared.bootstrap;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.fuggs.organization.domain.Organization;
import io.quarkus.runtime.LaunchMode;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

/**
 * Unified startup orchestrator that coordinates bootstrap sequence in
 * deterministic order.
 * <p>
 * Execution order: 1. Bootstrap organizations 2. Bootstrap users + members 3.
 * DEV mode only: Seed demo data
 */
@ApplicationScoped
public class StartupOrchestrator
{
	private static final Logger LOG = LoggerFactory.getLogger(StartupOrchestrator.class);

	@Inject
	BootstrapService bootstrapService;

	@Inject
	DataSeeder dataSeeder;

	/**
	 * Called when the application starts. Runs the bootstrap process in a
	 * deterministic order.
	 *
	 * @param event
	 *            The startup event
	 */
	void onStart(@Observes StartupEvent event)
	{
		LOG.info("Application starting - running bootstrap...");

		try
		{
			// 1. Create organizations
			List<Organization> orgs = bootstrapService.bootstrapOrganizations();
			LOG.info("Bootstrapped {} organizations", orgs.size());

			// 2. Create users + members
			bootstrapService.bootstrapUsers();
			LOG.info("Bootstrapped users and members");

			// 3. DEV ONLY: Seed demo data
			if (LaunchMode.current() == LaunchMode.DEVELOPMENT)
			{
				dataSeeder.seedDemoData(orgs);
				LOG.info("Seeded demo data for development mode");
			}

			LOG.info("Bootstrap completed successfully");
		}
		catch (Exception e)
		{
			LOG.error("Bootstrap failed during startup", e);
			// Don't prevent app startup, but log the error
		}
	}
}
