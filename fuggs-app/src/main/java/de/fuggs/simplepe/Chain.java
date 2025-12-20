package de.fuggs.simplepe;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * The Chain holds all state for a process instance. It acts as a token that
 * flows through the process, carrying data between tasks.
 *
 * The Chain is not a CDI bean - it's created per process instance.
 */
public class Chain
{
	private final String id;
	private final String processName;
	private final Map<String, Object> variables = new HashMap<>();

	private ChainStatus status = ChainStatus.RUNNING;
	private int currentTaskIndex = 0;
	private boolean waitingForUser = false;
	private String currentUserTask;
	private String error;

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
}
