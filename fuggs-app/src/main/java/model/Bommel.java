package model;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;

@Entity
public class Bommel
{
	@Id
	public String id;

	public String icon;
	public String title;

	@ManyToOne(fetch = FetchType.LAZY)
	public Bommel parent;

	@OneToMany(mappedBy = "parent", fetch = FetchType.LAZY)
	public List<Bommel> children = new ArrayList<>();

	public Bommel()
	{
		this.id = UUID.randomUUID().toString();
	}

	public List<Bommel> getChildren()
	{
		return children;
	}

	public boolean hasChildren()
	{
		return children != null && !children.isEmpty();
	}

	public String getDisplayLabel()
	{
		return title;
	}
}
