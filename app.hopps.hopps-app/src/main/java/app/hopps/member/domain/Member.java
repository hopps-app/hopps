package app.hopps.member.domain;

import java.util.ArrayList;
import java.util.List;

import app.hopps.bommel.domain.Bommel;
import app.hopps.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Entity
public class Member extends PanacheEntity
{
	@NotBlank
	private String firstName;

	@NotBlank
	private String lastName;

	@Email
	private String email;

	private String phone;

	@Column(unique = true)
	private String userName;

	@ManyToOne(optional = false)
	@JoinColumn(name = "organization_id", nullable = false)
	private Organization organization;

	@OneToMany(mappedBy = "responsibleMember", fetch = FetchType.LAZY)
	private List<Bommel> responsibleBommels = new ArrayList<>();

	public Long getId()
	{
		return id;
	}

	public String getFirstName()
	{
		return firstName;
	}

	public void setFirstName(String firstName)
	{
		this.firstName = firstName;
	}

	public String getLastName()
	{
		return lastName;
	}

	public void setLastName(String lastName)
	{
		this.lastName = lastName;
	}

	public String getEmail()
	{
		return email;
	}

	public void setEmail(String email)
	{
		this.email = email;
	}

	public String getPhone()
	{
		return phone;
	}

	public void setPhone(String phone)
	{
		this.phone = phone;
	}

	public List<Bommel> getResponsibleBommels()
	{
		return responsibleBommels;
	}

	public String getUserName()
	{
		return userName;
	}

	public void setUserName(String userName)
	{
		this.userName = userName;
	}

	public Organization getOrganization()
	{
		return organization;
	}

	public void setOrganization(Organization organization)
	{
		this.organization = organization;
	}

	public String getDisplayName()
	{
		return firstName + " " + lastName;
	}

	public String generateUsername()
	{
		// Return actual userName if set
		if (userName != null && !userName.isBlank())
		{
			return userName;
		}
		// Generate from name only if userName not set
		if (firstName != null && lastName != null)
		{
			return (firstName + "." + lastName).toLowerCase()
				.replaceAll("\\s+", "")
				.replaceAll("[^a-z0-9.]", "");
		}
		return "user";
	}
}
