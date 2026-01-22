package app.fuggs.workflow;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Defines a process as a sequence of tasks. ProcessDefinitions are stateless
 * templates - actual execution state is held in the Chain.
 */
public class ProcessDefinition
{
	private final String name;
	private final List<Task> tasks = new ArrayList<>();

	public ProcessDefinition(String name)
	{
		this.name = name;
	}

	public String getName()
	{
		return name;
	}

	public ProcessDefinition addTask(Task task)
	{
		tasks.add(task);
		return this;
	}

	public List<Task> getTasks()
	{
		return Collections.unmodifiableList(tasks);
	}

	public Task getTask(int index)
	{
		if (index < 0 || index >= tasks.size())
		{
			return null;
		}
		return tasks.get(index);
	}

	public int getTaskCount()
	{
		return tasks.size();
	}
}
