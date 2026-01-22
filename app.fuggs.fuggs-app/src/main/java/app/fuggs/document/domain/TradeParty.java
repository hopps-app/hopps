package app.fuggs.document.domain;

import app.fuggs.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class TradeParty extends PanacheEntity
{
	@ManyToOne(optional = false)
	@JoinColumn(name = "organization_id", nullable = false)
	private Organization organization;

	private String name;
	private String country;
	private String state;
	private String city;
	private String zipCode;
	private String street;
	private String additionalAddress;
	private String taxId;
	private String vatId;

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

	public String getCountry()
	{
		return country;
	}

	public void setCountry(String country)
	{
		this.country = country;
	}

	public String getState()
	{
		return state;
	}

	public void setState(String state)
	{
		this.state = state;
	}

	public String getCity()
	{
		return city;
	}

	public void setCity(String city)
	{
		this.city = city;
	}

	public String getZipCode()
	{
		return zipCode;
	}

	public void setZipCode(String zipCode)
	{
		this.zipCode = zipCode;
	}

	public String getStreet()
	{
		return street;
	}

	public void setStreet(String street)
	{
		this.street = street;
	}

	public String getAdditionalAddress()
	{
		return additionalAddress;
	}

	public void setAdditionalAddress(String additionalAddress)
	{
		this.additionalAddress = additionalAddress;
	}

	public String getTaxId()
	{
		return taxId;
	}

	public void setTaxId(String taxId)
	{
		this.taxId = taxId;
	}

	public String getVatId()
	{
		return vatId;
	}

	public void setVatId(String vatId)
	{
		this.vatId = vatId;
	}

	public String getDisplayAddress()
	{
		StringBuilder sb = new StringBuilder();
		if (street != null)
		{
			sb.append(street);
		}
		if (zipCode != null || city != null)
		{
			if (!sb.isEmpty())
			{
				sb.append(", ");
			}
			if (zipCode != null)
			{
				sb.append(zipCode).append(" ");
			}
			if (city != null)
			{
				sb.append(city);
			}
		}
		return sb.toString().trim();
	}
}
