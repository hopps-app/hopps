package app.hopps.simplepe;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.simplepe.repository.ChainRepository;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Service that recovers process instances (chains) after application restart.
 *
 * On startup: - Chains with RUNNING status are marked as FAILED (crashed
 * mid-task, cannot safely resume) - Chains with WAITING status are logged (safe
 * to resume, waiting at UserTask boundary)
 */
@ApplicationScoped
public class ProcessRecoveryService
{
	private static final Logger LOG = LoggerFactory.getLogger(ProcessRecoveryService.class);

	@Inject
	ChainRepository chainRepository;

	@Transactional
	void onStartup(@Observes StartupEvent event)
	{
		LOG.info("Starting process recovery...");

		// Find chains that were running when application stopped (crashed
		// mid-task)
		List<Chain> runningChains = chainRepository.findByStatus(ChainStatus.RUNNING);
		if (!runningChains.isEmpty())
		{
			LOG.warn("Found {} chains that were RUNNING during restart - marking as FAILED",
				runningChains.size());
			for (Chain chain : runningChains)
			{
				chain.setError("Process interrupted by application restart");
				chainRepository.persist(chain);
				LOG.warn("Marked chain {} (process: {}) as FAILED", chain.getId(), chain.getProcessName());
			}
		}

		// Find chains that were waiting for user input (safe to resume)
		List<Chain> waitingChains = chainRepository.findWaitingChains();
		if (!waitingChains.isEmpty())
		{
			LOG.info("Found {} chains WAITING for user input - these can be safely resumed",
				waitingChains.size());
			for (Chain chain : waitingChains)
			{
				LOG.info("Chain {} (process: {}) is waiting for user task: {}", chain.getId(),
					chain.getProcessName(), chain.getCurrentUserTask());
			}
		}

		if (runningChains.isEmpty() && waitingChains.isEmpty())
		{
			LOG.info("No chains to recover");
		}

		LOG.info("Process recovery completed");
	}
}
