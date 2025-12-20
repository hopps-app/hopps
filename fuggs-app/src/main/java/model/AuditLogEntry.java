package model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;

@Entity
public class AuditLogEntry
{
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	public Long id;

	public String username;
	public LocalDateTime timestamp;
	public String taskName;
	public String details;
	public String entityName;
	public String entityId;

	@PrePersist
	public void prePersist()
	{
		if (timestamp == null)
		{
			timestamp = LocalDateTime.now();
		}
	}
}
