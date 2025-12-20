package app.hopps.audit.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import app.hopps.audit.domain.AuditLogEntry;

@ApplicationScoped
public class AuditLogRepository implements PanacheRepositoryBase<AuditLogEntry, Long>
{
	public List<AuditLogEntry> findByEntityId(String entityId)
	{
		return list("entityId", entityId);
	}

	public List<AuditLogEntry> findByEntityName(String entityName)
	{
		return list("entityName", entityName);
	}

	public List<AuditLogEntry> findByUsername(String username)
	{
		return list("username", username);
	}

	public List<AuditLogEntry> findByChainId(String chainId)
	{
		return list("entityName = ?1 and entityId = ?2", "Chain", chainId);
	}
}
