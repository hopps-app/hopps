package app.fuggs.document.domain;

import app.fuggs.bommel.domain.Bommel;
import app.fuggs.organization.domain.Organization;
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
import jakarta.persistence.Transient;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Entity
public class Document extends PanacheEntity
{
	@ManyToOne(fetch = FetchType.LAZY)
	private Bommel bommel;

	@ManyToOne(optional = false)
	@JoinColumn(name = "organization_id", nullable = false)
	private Organization organization;

	private String name;

	@Column(nullable = false)
	private BigDecimal total;

	private String currencyCode;

	private Instant transactionTime;

	@ManyToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
	private TradeParty sender;

	@ManyToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
	private TradeParty recipient;

	@OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<DocumentTag> documentTags = new ArrayList<>();

	private boolean privatelyPaid;

	// Tax field for Verein bookkeeping
	private BigDecimal totalTax;

	// File storage fields
	private String fileKey; // S3 object key
	private String fileName; // Original filename
	private String fileContentType; // MIME type
	private Long fileSize; // Size in bytes

	// AI analysis status
	@Enumerated(EnumType.STRING)
	private AnalysisStatus analysisStatus;
	private String analysisError;

	// Extraction source (which method extracted the data)
	@Enumerated(EnumType.STRING)
	private ExtractionSource extractionSource;

	// Overall document workflow status
	@Enumerated(EnumType.STRING)
	private DocumentStatus documentStatus;

	// Link to workflow instance for resuming workflow
	@Column(name = "workflow_instance_id", length = 36)
	private String workflowInstanceId;

	// User tracking for multi-user scenarios
	private String uploadedBy;
	private String analyzedBy;
	private String reviewedBy;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	// Transient field for transaction count (populated by controller)
	@Transient
	private Long transactionCount;

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

	public List<DocumentTag> getDocumentTags()
	{
		return documentTags;
	}

	public void setDocumentTags(List<DocumentTag> documentTags)
	{
		this.documentTags = documentTags;
	}

	/**
	 * Adds a tag with the specified source. If the tag already exists on this
	 * document, it will not be added again.
	 */
	public void addTag(app.fuggs.shared.domain.Tag tag, TagSource source)
	{
		// Check if this tag already exists on the document (by ID or name)
		boolean exists = documentTags.stream()
			.anyMatch(dt -> {
				app.fuggs.shared.domain.Tag existingTag = dt.getTag();
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
		DocumentTag documentTag = new DocumentTag(this, tag, source);
		documentTags.add(documentTag);
	}

	/**
	 * Removes all existing tags.
	 */
	public void clearTags()
	{
		documentTags.clear();
	}

	public boolean isPrivatelyPaid()
	{
		return privatelyPaid;
	}

	public void setPrivatelyPaid(boolean privatelyPaid)
	{
		this.privatelyPaid = privatelyPaid;
	}

	/**
	 * Calculates Nettobetrag (net amount before tax). Netto = Brutto - MwSt
	 */
	public BigDecimal getSubTotal()
	{
		if (total == null || totalTax == null)
		{
			return null;
		}
		return total.subtract(totalTax);
	}

	public BigDecimal getTotalTax()
	{
		return totalTax;
	}

	public void setTotalTax(BigDecimal totalTax)
	{
		this.totalTax = totalTax;
	}

	public Instant getCreatedAt()
	{
		return createdAt;
	}

	public String getDisplayTotal()
	{
		if (total == null)
		{
			return "-";
		}
		String currency = currencyCode != null ? currencyCode : "EUR";
		return String.format(Locale.GERMAN, "%.2f %s", total, currency);
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
		return "Beleg #" + id;
	}

	public String getTransactionDateForInput()
	{
		if (transactionTime == null)
		{
			return "";
		}
		return transactionTime.atZone(ZoneId.systemDefault()).toLocalDate().toString();
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

	/**
	 * Checks if the file is an image (for template use).
	 */
	public boolean isImage()
	{
		return fileContentType != null && fileContentType.startsWith("image/");
	}

	/**
	 * Checks if the file is a PDF (for template use).
	 */
	public boolean isPdf()
	{
		return "application/pdf".equals(fileContentType);
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

	public ExtractionSource getExtractionSource()
	{
		return extractionSource;
	}

	public void setExtractionSource(ExtractionSource extractionSource)
	{
		this.extractionSource = extractionSource;
	}

	/**
	 * Returns the extraction source as a display string for the UI.
	 */
	public String getDisplayExtractionSource()
	{
		if (extractionSource == null)
		{
			return null;
		}
		return switch (extractionSource)
		{
			case ZUGFERD -> "ZugFerd";
			case AI -> "Document AI";
			case MANUAL -> "Manuell";
		};
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

	/**
	 * Returns true if document has tags.
	 */
	public boolean hasTags()
	{
		return documentTags != null && !documentTags.isEmpty();
	}

	/**
	 * Returns true if document has any AI-generated tags.
	 */
	public boolean hasAiTags()
	{
		return documentTags != null && documentTags.stream().anyMatch(DocumentTag::isAiGenerated);
	}

	/**
	 * Returns tag names as comma-separated string for form input.
	 */
	public String getTagsAsString()
	{
		if (documentTags == null || documentTags.isEmpty())
		{
			return "";
		}
		return documentTags.stream()
			.map(DocumentTag::getName)
			.sorted()
			.collect(Collectors.joining(", "));
	}

	public DocumentStatus getDocumentStatus()
	{
		return documentStatus;
	}

	public void setDocumentStatus(DocumentStatus documentStatus)
	{
		this.documentStatus = documentStatus;
	}

	public String getWorkflowInstanceId()
	{
		return workflowInstanceId;
	}

	public void setWorkflowInstanceId(String workflowInstanceId)
	{
		this.workflowInstanceId = workflowInstanceId;
	}

	public String getUploadedBy()
	{
		return uploadedBy;
	}

	public void setUploadedBy(String uploadedBy)
	{
		this.uploadedBy = uploadedBy;
	}

	public String getAnalyzedBy()
	{
		return analyzedBy;
	}

	public void setAnalyzedBy(String analyzedBy)
	{
		this.analyzedBy = analyzedBy;
	}

	public String getReviewedBy()
	{
		return reviewedBy;
	}

	public void setReviewedBy(String reviewedBy)
	{
		this.reviewedBy = reviewedBy;
	}

	/**
	 * Returns the document status as a display string for the UI.
	 */
	public String getDisplayStatus()
	{
		if (documentStatus == null)
		{
			// Legacy documents without documentStatus - infer from
			// analysisStatus
			if (analysisStatus == AnalysisStatus.COMPLETED)
			{
				return "Bestätigt";
			}
			else if (analysisStatus == AnalysisStatus.PENDING || analysisStatus == AnalysisStatus.ANALYZING)
			{
				return "Wird analysiert";
			}
			else if (analysisStatus == AnalysisStatus.FAILED)
			{
				return "Fehlgeschlagen";
			}
			return "Hochgeladen";
		}

		return switch (documentStatus)
		{
			case UPLOADED -> "Hochgeladen";
			case ANALYZING -> "Wird analysiert";
			case ANALYZED -> "Analysiert";
			case CONFIRMED -> "Bestätigt";
			case FAILED -> "Fehlgeschlagen";
		};
	}

	/**
	 * Returns true if the document is ready for review (analysis complete,
	 * awaiting user confirmation).
	 */
	public boolean isReadyForReview()
	{
		return documentStatus == DocumentStatus.ANALYZED;
	}

	/**
	 * Returns true if the document has been confirmed by the user.
	 */
	public boolean isConfirmed()
	{
		return documentStatus == DocumentStatus.CONFIRMED;
	}

	/**
	 * Returns a JSON-like string representation for AI analysis.
	 */
	@Override
	public String toString()
	{
		StringBuilder sb = new StringBuilder();
		sb.append("{");
		if (name != null)
		{
			sb.append("\"name\": \"").append(name).append("\"");
		}
		if (total != null)
		{
			if (name != null)
			{
				sb.append(", ");
			}
			sb.append("\"total\": ").append(total);
			if (currencyCode != null)
			{
				sb.append(", \"currency\": \"").append(currencyCode).append("\"");
			}
		}
		if (sender != null && sender.getName() != null)
		{
			if (name != null || total != null)
			{
				sb.append(", ");
			}
			sb.append("\"sender\": \"").append(sender.getName()).append("\"");
		}
		sb.append("}");
		return sb.toString();
	}

	public Long getTransactionCount()
	{
		return transactionCount;
	}

	public void setTransactionCount(Long transactionCount)
	{
		this.transactionCount = transactionCount;
	}

	/**
	 * Returns true if this document has associated transactions.
	 */
	public boolean hasTransactions()
	{
		return transactionCount != null && transactionCount > 0;
	}

	/**
	 * Returns formatted transaction count for display.
	 */
	public String getDisplayTransactionCount()
	{
		if (transactionCount == null || transactionCount == 0)
		{
			return "Keine Transaktion";
		}
		else if (transactionCount == 1)
		{
			return "1 Transaktion";
		}
		else
		{
			return transactionCount + " Transaktionen";
		}
	}
}
