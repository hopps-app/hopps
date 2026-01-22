package app.fuggs.transaction.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import app.fuggs.bommel.domain.Bommel;
import app.fuggs.document.domain.Document;
import app.fuggs.document.domain.TradeParty;
import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.domain.Tag;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;

@Entity
public class TransactionRecord extends PanacheEntity
{
	// Relationships (all nullable for flexibility)
	@ManyToOne(fetch = FetchType.LAZY)
	private Bommel bommel;

	@ManyToOne(fetch = FetchType.LAZY)
	private Document document;

	@ManyToOne(optional = false)
	@JoinColumn(name = "organization_id", nullable = false)
	private Organization organization;

	@ManyToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
	private TradeParty sender;

	@ManyToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
	private TradeParty recipient;

	@OneToMany(mappedBy = "transactionRecord", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<TransactionTag> transactionTags = new ArrayList<>();

	// Core fields
	@Column(nullable = false, updatable = false)
	private String uploader;

	@Column(nullable = false)
	private BigDecimal total;

	@Column(nullable = false)
	private boolean privatelyPaid;

	@Column(name = "transaction_time")
	private Instant transactionTime;

	// Optional descriptive fields
	private String name;
	private String currencyCode;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	public TransactionRecord()
	{
		this.createdAt = Instant.now();
		this.privatelyPaid = false;
	}

	public TransactionRecord(BigDecimal total, String uploader)
	{
		this();
		this.total = total;
		this.uploader = uploader;
	}

	// Getters and Setters
	public Long getId()
	{
		return id;
	}

	public Bommel getBommel()
	{
		return bommel;
	}

	public void setBommel(Bommel bommel)
	{
		this.bommel = bommel;
	}

	public Organization getOrganization()
	{
		return organization;
	}

	public void setOrganization(Organization organization)
	{
		this.organization = organization;
	}

	public Document getDocument()
	{
		return document;
	}

	public void setDocument(Document document)
	{
		this.document = document;
	}

	public String getUploader()
	{
		return uploader;
	}

	public void setUploader(String uploader)
	{
		this.uploader = uploader;
	}

	public BigDecimal getTotal()
	{
		return total;
	}

	public void setTotal(BigDecimal total)
	{
		this.total = total;
	}

	public boolean isPrivatelyPaid()
	{
		return privatelyPaid;
	}

	public void setPrivatelyPaid(boolean privatelyPaid)
	{
		this.privatelyPaid = privatelyPaid;
	}

	public Instant getTransactionTime()
	{
		return transactionTime;
	}

	public void setTransactionTime(Instant transactionTime)
	{
		this.transactionTime = transactionTime;
	}

	public TradeParty getSender()
	{
		return sender;
	}

	public void setSender(TradeParty sender)
	{
		this.sender = sender;
	}

	public TradeParty getRecipient()
	{
		return recipient;
	}

	public void setRecipient(TradeParty recipient)
	{
		this.recipient = recipient;
	}

	public List<TransactionTag> getTransactionTags()
	{
		return transactionTags;
	}

	public void setTransactionTags(List<TransactionTag> transactionTags)
	{
		this.transactionTags = transactionTags;
	}

	public String getName()
	{
		return name;
	}

	public void setName(String name)
	{
		this.name = name;
	}

	public String getCurrencyCode()
	{
		return currencyCode;
	}

	public void setCurrencyCode(String currencyCode)
	{
		this.currencyCode = currencyCode;
	}

	public Instant getCreatedAt()
	{
		return createdAt;
	}

	// Tag management methods (following Document pattern)

	/**
	 * Adds a tag with the specified source. If the tag already exists on this
	 * transaction, it will not be added again.
	 */
	public void addTag(Tag tag, TagSource source)
	{
		// Check if this tag already exists (by ID or name)
		boolean exists = transactionTags.stream()
			.anyMatch(tt -> {
				Tag existingTag = tt.getTag();
				// Compare by ID if both have IDs, otherwise by name
				if (existingTag.getId() != null && tag.getId() != null)
				{
					return existingTag.getId().equals(tag.getId());
				}
				return existingTag.getName().equalsIgnoreCase(tag.getName());
			});
		if (exists)
		{
			return;
		}
		TransactionTag transactionTag = new TransactionTag(this, tag, source);
		transactionTags.add(transactionTag);
	}

	/**
	 * Removes all existing tags.
	 */
	public void clearTags()
	{
		transactionTags.clear();
	}

	// Template helper methods (for Qute CheckedTemplate)

	/**
	 * Returns formatted total with currency (e.g., "42,50 EUR").
	 */
	public String getDisplayTotal()
	{
		if (total == null)
		{
			return "-";
		}
		String currency = currencyCode != null ? currencyCode : "EUR";
		return String.format(Locale.GERMAN, "%.2f %s", total, currency);
	}

	/**
	 * Returns formatted transaction date (e.g., "15.12.2024").
	 */
	public String getDisplayDate()
	{
		if (transactionTime == null)
		{
			return "-";
		}
		LocalDate date = transactionTime.atZone(ZoneId.systemDefault()).toLocalDate();
		return date.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
	}

	/**
	 * Returns display name for the transaction (name, sender name, or default).
	 */
	public String getDisplayName()
	{
		if (name != null && !name.isBlank())
		{
			return name;
		}
		if (sender != null && sender.getName() != null)
		{
			return sender.getName();
		}
		return "Transaktion #" + id;
	}

	/**
	 * Returns sender name or empty string (safe for templates).
	 */
	public String getSenderName()
	{
		return sender != null && sender.getName() != null ? sender.getName() : "";
	}

	/**
	 * Returns sender street or empty string (safe for templates).
	 */
	public String getSenderStreet()
	{
		return sender != null && sender.getStreet() != null ? sender.getStreet() : "";
	}

	/**
	 * Returns sender zip code or empty string (safe for templates).
	 */
	public String getSenderZipCode()
	{
		return sender != null && sender.getZipCode() != null ? sender.getZipCode() : "";
	}

	/**
	 * Returns sender city or empty string (safe for templates).
	 */
	public String getSenderCity()
	{
		return sender != null && sender.getCity() != null ? sender.getCity() : "";
	}

	/**
	 * Returns true if this transaction has any tags.
	 */
	public boolean hasTags()
	{
		return transactionTags != null && !transactionTags.isEmpty();
	}

	/**
	 * Returns true if this transaction has any AI-generated tags.
	 */
	public boolean hasAiTags()
	{
		return transactionTags != null
			&& transactionTags.stream().anyMatch(TransactionTag::isAiGenerated);
	}

	/**
	 * Returns comma-separated list of tag names (for display).
	 */
	public String getTagsAsString()
	{
		if (transactionTags == null || transactionTags.isEmpty())
		{
			return "";
		}
		return transactionTags.stream()
			.map(TransactionTag::getName)
			.sorted()
			.collect(Collectors.joining(", "));
	}

	/**
	 * Returns transaction date formatted for HTML input (yyyy-MM-dd).
	 */
	public String getTransactionDateForInput()
	{
		if (transactionTime == null)
		{
			return "";
		}
		return transactionTime.atZone(ZoneId.systemDefault()).toLocalDate().toString();
	}

	/**
	 * Returns transaction date in ISO format (alias for
	 * getTransactionDateForInput).
	 */
	public String getDisplayDateIso()
	{
		return getTransactionDateForInput();
	}
}
