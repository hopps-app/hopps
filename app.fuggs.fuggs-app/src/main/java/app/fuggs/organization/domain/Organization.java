package app.fuggs.organization.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

@Entity
public class Organization extends PanacheEntity
{
	@Column(nullable = false, unique = true)
	@NotBlank
	private String name;

	@Column(nullable = false, unique = true)
	@NotBlank
	private String slug;

	private String displayName;

	private String description;

	@Column(nullable = false)
	private boolean active = true;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@PrePersist
	void onCreate()
	{
		this.createdAt = Instant.now();
		if (this.displayName == null || this.displayName.isBlank())
		{
			this.displayName = this.name;
		}
	}

	// Getters and setters

	public String getName()
	{
		return name;
	}

	public void setName(String name)
	{
		this.name = name;
	}

	public String getSlug()
	{
		return slug;
	}

	public void setSlug(String slug)
	{
		this.slug = slug;
	}

	public String getDisplayName()
	{
		return displayName;
	}

	public void setDisplayName(String displayName)
	{
		this.displayName = displayName;
	}

	public String getDescription()
	{
		return description;
	}

	public void setDescription(String description)
	{
		this.description = description;
	}

	public boolean isActive()
	{
		return active;
	}

	public void setActive(boolean active)
	{
		this.active = active;
	}

	public Instant getCreatedAt()
	{
		return createdAt;
	}
}
