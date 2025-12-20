package model;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class Bommel
{
	public String id;
	public String icon;
	public String title;
	public Bommel parent;

	private static final List<Bommel> all = new ArrayList<>();

	public Bommel()
	{
		this.id = UUID.randomUUID().toString();
	}

	public static List<Bommel> listAll()
	{
		return all;
	}

	public static Bommel findById(String id)
	{
		return all.stream()
			.filter(b -> b.id.equals(id))
			.findFirst()
			.orElse(null);
	}

	public static Bommel findRoot()
	{
		return all.stream()
			.filter(b -> b.parent == null)
			.findFirst()
			.orElse(null);
	}

	public static boolean hasRoot()
	{
		return findRoot() != null;
	}

	public void persist()
	{
		all.add(this);
	}

	public void delete()
	{
		all.remove(this);
	}

	public List<Bommel> getChildren()
	{
		return all.stream()
			.filter(b -> b.parent != null && b.parent.id.equals(this.id))
			.toList();
	}

	public boolean hasChildren()
	{
		return !getChildren().isEmpty();
	}

	public String getDisplayLabel()
	{
		return title;
	}
}
