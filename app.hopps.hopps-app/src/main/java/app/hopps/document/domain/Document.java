package app.hopps.document.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;

import app.hopps.bommel.domain.Bommel;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;

@Entity
public class Document extends PanacheEntity
{
	@ManyToOne(fetch = FetchType.LAZY)
	private Bommel bommel;

	@Column(nullable = false)
	@Enumerated(EnumType.STRING)
	private DocumentType documentType;

	private String name;

	@Column(nullable = false)
	private BigDecimal total;

	private String currencyCode;

	private Instant transactionTime;

	@ManyToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
	private TradeParty sender;

	@ManyToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
	private TradeParty recipient;

	@ElementCollection
	@CollectionTable
	private Set<String> tags = new HashSet<>();

	private boolean privatelyPaid;

	// Invoice-specific fields
	private String orderNumber;
	private String invoiceId;
	private Instant dueDate;
	private BigDecimal amountDue;

	// File storage fields
	private String fileKey; // S3 object key
	private String fileName; // Original filename
	private String fileContentType; // MIME type
	private Long fileSize; // Size in bytes

	// AI analysis status
	@Enumerated(EnumType.STRING)
	private AnalysisStatus analysisStatus;
	private String analysisError;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	public Document()
	{
		this.createdAt = Instant.now();
	}

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

	public DocumentType getDocumentType()
	{
		return documentType;
	}

	public void setDocumentType(DocumentType documentType)
	{
		this.documentType = documentType;
	}

	public String getName()
	{
		return name;
	}

	public void setName(String name)
	{
		this.name = name;
	}

	public BigDecimal getTotal()
	{
		return total;
	}

	public void setTotal(BigDecimal total)
	{
		this.total = total;
	}

	public String getCurrencyCode()
	{
		return currencyCode;
	}

	public void setCurrencyCode(String currencyCode)
	{
		this.currencyCode = currencyCode;
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

	public Set<String> getTags()
	{
		return tags;
	}

	public void setTags(Set<String> tags)
	{
		this.tags = tags;
	}

	public boolean isPrivatelyPaid()
	{
		return privatelyPaid;
	}

	public void setPrivatelyPaid(boolean privatelyPaid)
	{
		this.privatelyPaid = privatelyPaid;
	}

	public String getOrderNumber()
	{
		return orderNumber;
	}

	public void setOrderNumber(String orderNumber)
	{
		this.orderNumber = orderNumber;
	}

	public String getInvoiceId()
	{
		return invoiceId;
	}

	public void setInvoiceId(String invoiceId)
	{
		this.invoiceId = invoiceId;
	}

	public Instant getDueDate()
	{
		return dueDate;
	}

	public void setDueDate(Instant dueDate)
	{
		this.dueDate = dueDate;
	}

	public BigDecimal getAmountDue()
	{
		return amountDue;
	}

	public void setAmountDue(BigDecimal amountDue)
	{
		this.amountDue = amountDue;
	}

	public Instant getCreatedAt()
	{
		return createdAt;
	}

	public String getDisplayType()
	{
		return documentType == DocumentType.INVOICE ? "Rechnung" : "Beleg";
	}

	public String getDisplayTotal()
	{
		if (total == null)
		{
			return "-";
		}
		String currency = currencyCode != null ? currencyCode : "EUR";
		return String.format("%.2f %s", total, currency);
	}

	public boolean isTotalPositive()
	{
		return total != null && total.compareTo(BigDecimal.ZERO) > 0;
	}

	public String getDisplayDate()
	{
		if (transactionTime == null)
		{
			return "-";
		}
		LocalDate date = transactionTime.atZone(ZoneId.systemDefault()).toLocalDate();
		return date.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
	}

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
		return getDisplayType() + " #" + id;
	}

	public String getTransactionDateForInput()
	{
		if (transactionTime == null)
		{
			return "";
		}
		return transactionTime.atZone(ZoneId.systemDefault()).toLocalDate().toString();
	}

	public String getDueDateForInput()
	{
		if (dueDate == null)
		{
			return "";
		}
		return dueDate.atZone(ZoneId.systemDefault()).toLocalDate().toString();
	}

	public String getSenderName()
	{
		return sender != null ? sender.getName() : "";
	}

	public String getSenderStreet()
	{
		return sender != null ? sender.getStreet() : "";
	}

	public String getSenderZipCode()
	{
		return sender != null ? sender.getZipCode() : "";
	}

	public String getSenderCity()
	{
		return sender != null ? sender.getCity() : "";
	}

	public String getFileKey()
	{
		return fileKey;
	}

	public void setFileKey(String fileKey)
	{
		this.fileKey = fileKey;
	}

	public String getFileName()
	{
		return fileName;
	}

	public void setFileName(String fileName)
	{
		this.fileName = fileName;
	}

	public String getFileContentType()
	{
		return fileContentType;
	}

	public void setFileContentType(String fileContentType)
	{
		this.fileContentType = fileContentType;
	}

	public Long getFileSize()
	{
		return fileSize;
	}

	public void setFileSize(Long fileSize)
	{
		this.fileSize = fileSize;
	}

	public boolean hasFile()
	{
		return fileKey != null && !fileKey.isBlank();
	}

	public String getDisplayFileSize()
	{
		if (fileSize == null)
		{
			return "-";
		}
		if (fileSize < 1024)
		{
			return fileSize + " B";
		}
		else if (fileSize < 1024 * 1024)
		{
			return String.format("%.1f KB", fileSize / 1024.0);
		}
		else
		{
			return String.format("%.1f MB", fileSize / (1024.0 * 1024.0));
		}
	}

	public AnalysisStatus getAnalysisStatus()
	{
		return analysisStatus;
	}

	public void setAnalysisStatus(AnalysisStatus analysisStatus)
	{
		this.analysisStatus = analysisStatus;
	}

	public String getAnalysisError()
	{
		return analysisError;
	}

	public void setAnalysisError(String analysisError)
	{
		this.analysisError = analysisError;
	}

	public boolean isAnalyzing()
	{
		return analysisStatus == AnalysisStatus.PENDING
			|| analysisStatus == AnalysisStatus.ANALYZING;
	}

	public boolean isAnalysisComplete()
	{
		return analysisStatus == AnalysisStatus.COMPLETED
			|| analysisStatus == AnalysisStatus.FAILED
			|| analysisStatus == AnalysisStatus.SKIPPED;
	}
}
