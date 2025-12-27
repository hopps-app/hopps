package app.hopps.simplepe;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

/**
 * The Chain holds all state for a process instance. It acts as a token that
 * flows through the process, carrying data between tasks.
 *
 * Process instances are persisted to the database so they survive application
 * restarts. UserTasks can wait for user input across server reboots.
 */
@Entity
public class Chain extends PanacheEntityBase
{
	@Id
	@Column(length = 36)
	private String id;

	@Column(nullable = false)
	private String processName;

	@JdbcTypeCode(SqlTypes.JSON)
	private Map<String, Object> variables = new HashMap<>();

	@Enumerated(EnumType.STRING)
	@Column(length = 20, nullable = false)
	private ChainStatus status = ChainStatus.RUNNING;

	@Column(nullable = false)
	private int currentTaskIndex = 0;

	@Column(nullable = false)
	private boolean waitingForUser = false;

	private String currentUserTask;

	@Column(length = 2000)
	private String error;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	// No-arg constructor required by JPA
	public Chain()
	{
	}

	public Chain(String processName)
	{
		this.id = UUID.randomUUID().toString();
		this.processName = processName;
	}

	// For reconstruction from persistence
	public Chain(String id, String processName)
	{
		this.id = id;
		this.processName = processName;
	}

	@PrePersist
	void prePersist()
	{
		if (createdAt == null)
		{
			createdAt = Instant.now();
		}
		updatedAt = Instant.now();
	}

	@PreUpdate
	void preUpdate()
	{
		updatedAt = Instant.now();
	}

	public String getId()
	{
		return id;
	}

	public String getProcessName()
	{
		return processName;
	}

	public ChainStatus getStatus()
	{
		return status;
	}

	public void setStatus(ChainStatus status)
	{
		this.status = status;
	}

	public int getCurrentTaskIndex()
	{
		return currentTaskIndex;
	}

	public void setCurrentTaskIndex(int index)
	{
		this.currentTaskIndex = index;
	}

	public void incrementTaskIndex()
	{
		this.currentTaskIndex++;
	}

	public boolean isWaitingForUser()
	{
		return waitingForUser;
	}

	public void setWaitingForUser(boolean waiting)
	{
		this.waitingForUser = waiting;
		if (waiting)
		{
			this.status = ChainStatus.WAITING;
		}
	}

	public String getCurrentUserTask()
	{
		return currentUserTask;
	}

	public void setCurrentUserTask(String taskName)
	{
		this.currentUserTask = taskName;
	}

	public String getError()
	{
		return error;
	}

	public void setError(String error)
	{
		this.error = error;
		this.status = ChainStatus.FAILED;
	}

	// Variable management

	public void setVariable(String key, Object value)
	{
		variables.put(key, value);
	}

	public Object getVariable(String key)
	{
		return variables.get(key);
	}

	@SuppressWarnings("unchecked")
	public <T> T getVariable(String key, Class<T> type)
	{
		Object value = variables.get(key);
		if (value == null)
		{
			return null;
		}
		return (T)value;
	}

	public boolean hasVariable(String key)
	{
		return variables.containsKey(key);
	}

	public Map<String, Object> getVariables()
	{
		return new HashMap<>(variables);
	}

	public void setVariables(Map<String, Object> vars)
	{
		this.variables.clear();
		this.variables.putAll(vars);
	}

	public Instant getCreatedAt()
	{
		return createdAt;
	}

	public Instant getUpdatedAt()
	{
		return updatedAt;
	}
}
