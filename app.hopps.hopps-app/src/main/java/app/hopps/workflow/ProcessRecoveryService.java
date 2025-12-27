package app.hopps.workflow;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.workflow.repository.WorkflowInstanceRepository;
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
	WorkflowInstanceRepository chainRepository;

	@Transactional
	void onStartup(@Observes StartupEvent event)
	{
		LOG.info("Starting process recovery...");

		// Find chains that were running when application stopped (crashed
		// mid-task)
		List<WorkflowInstance> runningChains = chainRepository.findByStatus(WorkflowStatus.RUNNING);
		if (!runningChains.isEmpty())
		{
			LOG.warn("Found {} chains that were RUNNING during restart - marking as FAILED",
				runningChains.size());
			for (WorkflowInstance instance : runningChains)
			{
				instance.setError("Process interrupted by application restart");
				chainRepository.persist(instance);
				LOG.warn("Marked chain {} (process: {}) as FAILED", instance.getId(), instance.getProcessName());
			}
		}

		// Find chains that were waiting for user input (safe to resume)
		List<WorkflowInstance> waitingChains = chainRepository.findWaitingChains();
		if (!waitingChains.isEmpty())
		{
			LOG.info("Found {} chains WAITING for user input - these can be safely resumed",
				waitingChains.size());
			for (WorkflowInstance instance : waitingChains)
			{
				LOG.info("WorkflowInstance {} (process: {}) is waiting for user task: {}", instance.getId(),
					instance.getProcessName(), instance.getCurrentUserTask());
			}
		}

		if (runningChains.isEmpty() && waitingChains.isEmpty())
		{
			LOG.info("No chains to recover");
		}

		LOG.info("Process recovery completed");
	}
}
