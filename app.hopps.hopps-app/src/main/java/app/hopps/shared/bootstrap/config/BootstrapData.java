package app.hopps.shared.bootstrap.config;

import java.util.ArrayList;
import java.util.List;

/**
 * Root class for bootstrap configuration loaded from YAML.
 */
public class BootstrapData
{
	private List<OrganizationData> organizations = new ArrayList<>();
	private List<UserData> users = new ArrayList<>();

	public List<OrganizationData> getOrganizations()
	{
		return organizations;
	}

	public void setOrganizations(List<OrganizationData> organizations)
	{
		this.organizations = organizations;
	}

	public List<UserData> getUsers()
	{
		return users;
	}

	public void setUsers(List<UserData> users)
	{
		this.users = users;
	}

	/**
	 * Organization configuration.
	 */
	public static class OrganizationData
	{
		private String name;
		private String slug;
		private String displayName;
		private DemoData demo;

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
			return displayName != null ? displayName : name;
		}

		public void setDisplayName(String displayName)
		{
			this.displayName = displayName;
		}

		public DemoData getDemo()
		{
			return demo;
		}

		public void setDemo(DemoData demo)
		{
			this.demo = demo;
		}
	}

	/**
	 * User configuration for Keycloak + Member.
	 */
	public static class UserData
	{
		private String username;
		private String email;
		private String firstName;
		private String lastName;
		private List<String> roles = new ArrayList<>();
		private String organizationSlug;

		public String getUsername()
		{
			return username;
		}

		public void setUsername(String username)
		{
			this.username = username;
		}

		public String getEmail()
		{
			return email;
		}

		public void setEmail(String email)
		{
			this.email = email;
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

		public List<String> getRoles()
		{
			return roles;
		}

		public void setRoles(List<String> roles)
		{
			this.roles = roles;
		}

		public String getOrganizationSlug()
		{
			return organizationSlug;
		}

		public void setOrganizationSlug(String organizationSlug)
		{
			this.organizationSlug = organizationSlug;
		}
	}

	/**
	 * Demo data for an organization.
	 */
	public static class DemoData
	{
		private List<MemberData> members = new ArrayList<>();
		private List<BommelData> bommels = new ArrayList<>();
		private List<TagData> tags = new ArrayList<>();
		private List<DocumentData> documents = new ArrayList<>();
		private List<TransactionData> transactions = new ArrayList<>();

		public List<MemberData> getMembers()
		{
			return members;
		}

		public void setMembers(List<MemberData> members)
		{
			this.members = members;
		}

		public List<BommelData> getBommels()
		{
			return bommels;
		}

		public void setBommels(List<BommelData> bommels)
		{
			this.bommels = bommels;
		}

		public List<TagData> getTags()
		{
			return tags;
		}

		public void setTags(List<TagData> tags)
		{
			this.tags = tags;
		}

		public List<DocumentData> getDocuments()
		{
			return documents;
		}

		public void setDocuments(List<DocumentData> documents)
		{
			this.documents = documents;
		}

		public List<TransactionData> getTransactions()
		{
			return transactions;
		}

		public void setTransactions(List<TransactionData> transactions)
		{
			this.transactions = transactions;
		}
	}

	/**
	 * Demo member configuration.
	 */
	public static class MemberData
	{
		private String firstName;
		private String lastName;
		private String username;
		private String email;
		private String phone;

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

		public String getUsername()
		{
			return username;
		}

		public void setUsername(String username)
		{
			this.username = username;
		}

		public String getEmail()
		{
			return email != null ? email : username + "@demo.local";
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
	}

	/**
	 * Demo bommel configuration.
	 */
	public static class BommelData
	{
		private String ref;
		private String title;
		private String icon;
		private String parentRef = "root";
		private String responsibleMember;

		public String getRef()
		{
			return ref;
		}

		public void setRef(String ref)
		{
			this.ref = ref;
		}

		public String getTitle()
		{
			return title;
		}

		public void setTitle(String title)
		{
			this.title = title;
		}

		public String getIcon()
		{
			return icon;
		}

		public void setIcon(String icon)
		{
			this.icon = icon;
		}

		public String getParentRef()
		{
			return parentRef;
		}

		public void setParentRef(String parentRef)
		{
			this.parentRef = parentRef;
		}

		public String getResponsibleMember()
		{
			return responsibleMember;
		}

		public void setResponsibleMember(String responsibleMember)
		{
			this.responsibleMember = responsibleMember;
		}
	}

	/**
	 * Demo tag configuration.
	 */
	public static class TagData
	{
		private String ref;
		private String name;

		public String getRef()
		{
			return ref;
		}

		public void setRef(String ref)
		{
			this.ref = ref;
		}

		public String getName()
		{
			return name;
		}

		public void setName(String name)
		{
			this.name = name;
		}
	}

	/**
	 * Demo document configuration.
	 */
	public static class DocumentData
	{
		private String name;
		private String total;
		private String totalTax;
		private String currencyCode = "EUR";
		private String date;
		private String bommelRef;
		private String tagRefs;
		private boolean confirmed;
		private boolean privatelyPaid;
		private boolean createTransaction;
		private SenderData sender;

		public String getName()
		{
			return name;
		}

		public void setName(String name)
		{
			this.name = name;
		}

		public String getTotal()
		{
			return total;
		}

		public void setTotal(String total)
		{
			this.total = total;
		}

		public String getTotalTax()
		{
			return totalTax;
		}

		public void setTotalTax(String totalTax)
		{
			this.totalTax = totalTax;
		}

		public String getCurrencyCode()
		{
			return currencyCode;
		}

		public void setCurrencyCode(String currencyCode)
		{
			this.currencyCode = currencyCode;
		}

		public String getDate()
		{
			return date;
		}

		public void setDate(String date)
		{
			this.date = date;
		}

		public String getBommelRef()
		{
			return bommelRef;
		}

		public void setBommelRef(String bommelRef)
		{
			this.bommelRef = bommelRef;
		}

		public String getTagRefs()
		{
			return tagRefs;
		}

		public void setTagRefs(String tagRefs)
		{
			this.tagRefs = tagRefs;
		}

		public boolean isConfirmed()
		{
			return confirmed;
		}

		public void setConfirmed(boolean confirmed)
		{
			this.confirmed = confirmed;
		}

		public boolean isPrivatelyPaid()
		{
			return privatelyPaid;
		}

		public void setPrivatelyPaid(boolean privatelyPaid)
		{
			this.privatelyPaid = privatelyPaid;
		}

		public boolean isCreateTransaction()
		{
			return createTransaction;
		}

		public void setCreateTransaction(boolean createTransaction)
		{
			this.createTransaction = createTransaction;
		}

		public SenderData getSender()
		{
			return sender;
		}

		public void setSender(SenderData sender)
		{
			this.sender = sender;
		}
	}

	/**
	 * Sender (TradeParty) configuration.
	 */
	public static class SenderData
	{
		private String name;
		private String street;
		private String zipCode;
		private String city;

		public String getName()
		{
			return name;
		}

		public void setName(String name)
		{
			this.name = name;
		}

		public String getStreet()
		{
			return street;
		}

		public void setStreet(String street)
		{
			this.street = street;
		}

		public String getZipCode()
		{
			return zipCode;
		}

		public void setZipCode(String zipCode)
		{
			this.zipCode = zipCode;
		}

		public String getCity()
		{
			return city;
		}

		public void setCity(String city)
		{
			this.city = city;
		}
	}

	/**
	 * Standalone transaction configuration.
	 */
	public static class TransactionData
	{
		private String name;
		private String amount;
		private String currencyCode = "EUR";
		private String date;
		private String bommelRef;

		public String getName()
		{
			return name;
		}

		public void setName(String name)
		{
			this.name = name;
		}

		public String getAmount()
		{
			return amount;
		}

		public void setAmount(String amount)
		{
			this.amount = amount;
		}

		public String getCurrencyCode()
		{
			return currencyCode;
		}

		public void setCurrencyCode(String currencyCode)
		{
			this.currencyCode = currencyCode;
		}

		public String getDate()
		{
			return date;
		}

		public void setDate(String date)
		{
			this.date = date;
		}

		public String getBommelRef()
		{
			return bommelRef;
		}

		public void setBommelRef(String bommelRef)
		{
			this.bommelRef = bommelRef;
		}
	}
}
