package app.fuggs.bommel.domain;

import java.util.ArrayList;
import java.util.List;

import app.fuggs.member.domain.Member;
import app.fuggs.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;

@Entity
public class Bommel extends PanacheEntity
{
	private String icon;
	private String title;

	@ManyToOne(fetch = FetchType.LAZY)
	public Bommel parent;

	@ManyToOne(fetch = FetchType.LAZY)
	private Member responsibleMember;

	@ManyToOne(optional = false)
	@JoinColumn(name = "organization_id", nullable = false)
	private Organization organization;

	@OneToMany(mappedBy = "parent", fetch = FetchType.LAZY)
	public List<Bommel> children = new ArrayList<>();

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
		return getTitle();
	}

	public Long getId()
	{
		return id;
	}

	public void setIcon(String icon)
	{
		this.icon = icon;
	}

	public String getIcon()
	{
		return icon;
	}

	public void setTitle(String title)
	{
		this.title = title;
	}

	public String getTitle()
	{
		return title;
	}

	public Member getResponsibleMember()
	{
		return responsibleMember;
	}

	public void setResponsibleMember(Member responsibleMember)
	{
		this.responsibleMember = responsibleMember;
	}

	public Organization getOrganization()
	{
		return organization;
	}

	public void setOrganization(Organization organization)
	{
		this.organization = organization;
	}
}
