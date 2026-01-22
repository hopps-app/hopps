package app.fuggs.shared.domain;

import app.fuggs.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = { "organization_id", "name" }))
public class Tag extends PanacheEntity
{
	@ManyToOne(optional = false)
	@JoinColumn(name = "organization_id", nullable = false)
	private Organization organization;

	@Column(nullable = false)
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

	public Organization getOrganization()
	{
		return organization;
	}

	public void setOrganization(Organization organization)
	{
		this.organization = organization;
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
