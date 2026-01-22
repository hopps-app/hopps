package app.fuggs.document.workflow;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.fuggs.bommel.domain.Bommel;
import app.fuggs.bommel.repository.BommelRepository;
import app.fuggs.document.domain.Document;
import app.fuggs.document.domain.DocumentStatus;
import app.fuggs.document.domain.TagSource;
import app.fuggs.document.domain.TradeParty;
import app.fuggs.document.repository.DocumentRepository;
import app.fuggs.shared.domain.Tag;
import app.fuggs.shared.repository.TagRepository;
import app.fuggs.workflow.UserTask;
import app.fuggs.workflow.WorkflowInstance;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * UserTask for reviewing and confirming AI-extracted document data. Pauses the
 * workflow until the user reviews the extracted data and either confirms it,
 * requests re-analysis, or chooses to enter data manually.
 */
@ApplicationScoped
@Transactional
public class ReviewDocumentTask extends UserTask
{
	private static final Logger LOG = LoggerFactory.getLogger(ReviewDocumentTask.class);

	public static final String TASK_NAME = "ReviewDocument";
	public static final String REVIEW_CONFIRMED = "reviewConfirmed";
	public static final String REANALYZE_REQUESTED = "reanalyzeRequested";
	public static final String MANUAL_ENTRY_REQUESTED = "manualEntryRequested";

	@Inject
	DocumentRepository documentRepository;

	@Inject
	BommelRepository bommelRepository;

	@Inject
	TagRepository tagRepository;

	@Override
	public String getTaskName()
	{
		return TASK_NAME;
	}

	@Override
	protected boolean validateInput(WorkflowInstance instance, Map<String, Object> userInput)
	{
		if (!userInput.containsKey("confirmed"))
		{
			instance.setError("Confirmation field is required");
			return false;
		}

		if (!userInput.containsKey("id"))
		{
			instance.setError("Document ID is required");
			return false;
		}

		return true;
	}

	@Override
	protected void processInput(WorkflowInstance instance, Map<String, Object> userInput)
	{
		Boolean confirmed = getBoolean(userInput, "confirmed");
		Boolean reanalyze = getBoolean(userInput, "reanalyze");
		Long documentId = getLong(userInput, "id");

		LOG.info("Processing review for document: documentId={}, confirmed={}, reanalyze={}",
			documentId, confirmed, reanalyze);

		Document document = documentRepository.findById(documentId);
		if (document == null)
		{
			throw new IllegalStateException("Document not found: " + documentId);
		}

		if (Boolean.TRUE.equals(confirmed))
		{
			// User confirmed - apply form data and mark as confirmed
			applyFormDataToDocument(document, userInput);
			document.setDocumentStatus(DocumentStatus.CONFIRMED);
			instance.setVariable(REVIEW_CONFIRMED, true);
			LOG.info("Document confirmed by user: documentId={}", documentId);
		}
		else if (Boolean.TRUE.equals(reanalyze))
		{
			// User rejected and wants to re-analyze
			document.setDocumentStatus(DocumentStatus.UPLOADED);
			document.setAnalysisError(null);
			document.setWorkflowInstanceId(null); // Clear workflow link for
													// re-analysis
			instance.setVariable(REVIEW_CONFIRMED, false);
			instance.setVariable(REANALYZE_REQUESTED, true);
			LOG.info("Document rejected, re-analysis requested: documentId={}", documentId);
		}
		else
		{
			// User rejected and wants manual entry
			document.setDocumentStatus(DocumentStatus.UPLOADED);
			document.setWorkflowInstanceId(null); // Clear workflow link
			instance.setVariable(REVIEW_CONFIRMED, false);
			instance.setVariable(MANUAL_ENTRY_REQUESTED, true);
			LOG.info("Document rejected, manual entry selected: documentId={}", documentId);
		}
	}

	/**
	 * Applies all form field data from userInput to the document entity. This
	 * mirrors the logic from DocumentResource.save() but operates on the
	 * userInput map from the workflow.
	 */
	private void applyFormDataToDocument(Document document, Map<String, Object> userInput)
	{
		// Basic fields
		document.setName(getString(userInput, "name"));

		BigDecimal total = getBigDecimal(userInput, "total");
		if (total != null)
		{
			document.setTotal(total);
		}

		BigDecimal totalTax = getBigDecimal(userInput, "totalTax");
		document.setTotalTax(totalTax);

		String currencyCode = getString(userInput, "currencyCode");
		document.setCurrencyCode(
			currencyCode != null && !currencyCode.isBlank() ? currencyCode : "EUR");

		Boolean privatelyPaid = getBoolean(userInput, "privatelyPaid");
		document.setPrivatelyPaid(Boolean.TRUE.equals(privatelyPaid));

		// Transaction date
		String transactionDate = getString(userInput, "transactionDate");
		if (transactionDate != null && !transactionDate.isBlank())
		{
			LocalDate date = LocalDate.parse(transactionDate);
			document.setTransactionTime(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
		}
		else
		{
			document.setTransactionTime(null);
		}

		// Bommel assignment
		Long bommelId = getLong(userInput, "bommelId");
		if (bommelId != null && bommelId > 0)
		{
			Bommel bommel = bommelRepository.findById(bommelId);
			document.setBommel(bommel);
		}
		else
		{
			document.setBommel(null);
		}

		// Sender/TradeParty
		String senderName = getString(userInput, "senderName");
		if (senderName != null && !senderName.isBlank())
		{
			TradeParty sender = document.getSender();
			if (sender == null)
			{
				sender = new TradeParty();
				sender.setOrganization(document.getOrganization());
			}
			sender.setName(senderName);
			sender.setStreet(getString(userInput, "senderStreet"));
			sender.setZipCode(getString(userInput, "senderZipCode"));
			sender.setCity(getString(userInput, "senderCity"));
			document.setSender(sender);
		}
		else if (document.getSender() != null)
		{
			document.setSender(null);
		}

		// Tags
		String tagsInput = getString(userInput, "tags");
		updateDocumentTags(document, tagsInput);

		LOG.debug("Applied form data to document: documentId={}", document.getId());
	}

	/**
	 * Parses comma-separated tag names and updates the document's tags.
	 * Preserves AI source for existing tags, adds new tags as MANUAL.
	 */
	private void updateDocumentTags(Document document, String tagsInput)
	{
		// Parse new tag names from input
		Set<String> newTagNames = new HashSet<>();
		if (tagsInput != null && !tagsInput.isBlank())
		{
			newTagNames = Arrays.stream(tagsInput.split(","))
				.map(String::trim)
				.map(String::toLowerCase)
				.filter(s -> !s.isEmpty())
				.collect(Collectors.toSet());
		}

		// Build map of current tag name -> DocumentTag (to preserve and reuse)
		Map<String, app.fuggs.document.domain.DocumentTag> existingTags = document.getDocumentTags()
			.stream()
			.collect(Collectors.toMap(
				dt -> dt.getName().toLowerCase(),
				dt -> dt,
				(a, b) -> a));

		// Find tags to remove (existing but not in new set)
		Set<String> existingTagNames = existingTags.keySet();
		Set<String> tagsToRemove = new HashSet<>(existingTagNames);
		tagsToRemove.removeAll(newTagNames);

		// Find tags to add (in new set but not existing)
		Set<String> tagsToAdd = new HashSet<>(newTagNames);
		tagsToAdd.removeAll(existingTagNames);

		// Remove tags that are no longer needed
		for (String tagName : tagsToRemove)
		{
			app.fuggs.document.domain.DocumentTag docTag = existingTags.get(tagName);
			document.getDocumentTags().remove(docTag);
		}

		// Add new tags
		if (!tagsToAdd.isEmpty())
		{
			Set<Tag> tagEntities = tagRepository.findOrCreateTags(tagsToAdd);
			for (Tag tag : tagEntities)
			{
				document.addTag(tag, TagSource.MANUAL);
			}
		}
	}

	// Helper methods to safely extract values from userInput map

	private String getString(Map<String, Object> map, String key)
	{
		Object value = map.get(key);
		return value != null ? value.toString() : null;
	}

	private Long getLong(Map<String, Object> map, String key)
	{
		Object value = map.get(key);
		return switch (value)
		{
			case null -> null;
			case Long l -> l;
			case Number number -> number.longValue();
			default -> Long.parseLong(value.toString());
		};
	}

	private BigDecimal getBigDecimal(Map<String, Object> map, String key)
	{
		Object value = map.get(key);
		return switch (value)
		{
			case null -> null;
			case BigDecimal bigDecimal -> bigDecimal;
			case Number number -> BigDecimal.valueOf(number.doubleValue());
			default -> new BigDecimal(value.toString());
		};
	}

	private Boolean getBoolean(Map<String, Object> map, String key)
	{
		Object value = map.get(key);
		if (value == null)
		{
			throw new IllegalArgumentException("Missing boolean value for key: " + key);
		}
		if (value instanceof Boolean)
		{
			return (Boolean)value;
		}
		return Boolean.parseBoolean(value.toString());
	}
}
