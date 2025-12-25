package app.hopps.shared.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
public class Tag extends PanacheEntity
{
	@Column(unique = true, nullable = false)
	private String name;

	public Tag()
	{
	}

	public Tag(String name)
	{
		this.name = name;
	}

	public Long getId()
	{
		return id;
	}

	public String getName()
	{
		return name;
	}

	public void setName(String name)
	{
		this.name = name;
	}

	@Override
	public boolean equals(Object o)
	{
		if (this == o)
			return true;
		if (o == null || getClass() != o.getClass())
			return false;
		Tag tag = (Tag)o;
		return name != null && name.equals(tag.name);
	}

	@Override
	public int hashCode()
	{
		return name != null ? name.hashCode() : 0;
	}

	@Override
	public String toString()
	{
		return name;
	}
}
