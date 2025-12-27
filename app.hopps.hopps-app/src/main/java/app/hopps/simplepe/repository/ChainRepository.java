package app.hopps.simplepe.repository;

import java.util.List;

import app.hopps.simplepe.Chain;
import app.hopps.simplepe.ChainStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Repository for Chain (process instance) persistence.
 */
@ApplicationScoped
public class ChainRepository implements PanacheRepositoryBase<Chain, String>
{
	/**
	 * Find all chains with a specific status. Useful for recovery - e.g., find
	 * all RUNNING chains (crashed), all WAITING chains (resumable).
	 */
	public List<Chain> findByStatus(ChainStatus status)
	{
		return list("status", status);
	}

	/**
	 * Find all chains for a specific process definition. Useful for debugging
	 * and monitoring.
	 */
	public List<Chain> findByProcessName(String processName)
	{
		return list("processName", processName);
	}

	/**
	 * Find all chains waiting for user input (WAITING status). These chains are
	 * safe to resume after application restart.
	 */
	public List<Chain> findWaitingChains()
	{
		return findByStatus(ChainStatus.WAITING);
	}

	/**
	 * Find all active chains (RUNNING or WAITING). These chains are in progress
	 * and not yet completed or failed.
	 */
	public List<Chain> findActiveChains()
	{
		return list("status in ?1", List.of(ChainStatus.RUNNING, ChainStatus.WAITING));
	}
}
