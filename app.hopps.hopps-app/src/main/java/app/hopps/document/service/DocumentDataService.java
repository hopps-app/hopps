package app.hopps.document.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.jboss.logging.Logger;

import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.domain.TagSource;
import app.hopps.document.domain.TradeParty;
import app.hopps.shared.domain.Tag;
import app.hopps.shared.repository.TagRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class DocumentDataService
{
	private static final Logger LOG = Logger.getLogger(DocumentDataService.class);

	@Inject
	TagRepository tagRepository;

	/**
	 * Applies form data directly to a document, bypassing workflow completion.
	 *
	 * @param document
	 *            the document to update
	 * @param userInput
	 *            the form data as a map
	 */
	public void applyFormData(Document document, Map<String, Object> userInput)
	{
		LOG.infof("Applying form data directly to document: documentId=%s", document.getId());

		// Extract and apply core fields
		if (userInput.containsKey("total") && userInput.get("total") != null)
		{
			String totalStr = userInput.get("total").toString();
			if (!totalStr.isBlank())
			{
				document.setTotal(new BigDecimal(totalStr));
			}
		}

		if (userInput.containsKey("name"))
		{
			document.setName((String)userInput.get("name"));
		}

		if (userInput.containsKey("transactionDate") && userInput.get("transactionDate") != null)
		{
			String dateStr = userInput.get("transactionDate").toString();
			if (!dateStr.isBlank())
			{
				LocalDate date = LocalDate.parse(dateStr);
				document.setTransactionTime(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
			}
		}

		if (userInput.containsKey("currencyCode"))
		{
			document.setCurrencyCode((String)userInput.get("currencyCode"));
		}

		if (userInput.containsKey("privatelyPaid"))
		{
			boolean privatelyPaid = Boolean.parseBoolean(userInput.get("privatelyPaid").toString());
			document.setPrivatelyPaid(privatelyPaid);
		}

		// Sender information
		applySenderData(document, userInput);

		// Invoice-specific fields
		applyInvoiceFields(document, userInput);

		LOG.infof("Form data applied successfully: documentId=%s", document.getId());
	}

	private void applySenderData(Document document, Map<String, Object> userInput)
	{
		String senderName = (String)userInput.get("senderName");
		String senderStreet = (String)userInput.get("senderStreet");
		String senderZipCode = (String)userInput.get("senderZipCode");
		String senderCity = (String)userInput.get("senderCity");

		boolean hasSenderData = (senderName != null && !senderName.isBlank())
			|| (senderStreet != null && !senderStreet.isBlank())
			|| (senderZipCode != null && !senderZipCode.isBlank())
			|| (senderCity != null && !senderCity.isBlank());

		if (hasSenderData)
		{
			TradeParty sender = document.getSender();
			if (sender == null)
			{
				sender = new TradeParty();
				document.setSender(sender);
			}

			sender.setName(senderName);
			sender.setStreet(senderStreet);
			sender.setZipCode(senderZipCode);
			sender.setCity(senderCity);
		}
	}

	private void applyInvoiceFields(Document document, Map<String, Object> userInput)
	{
		if (document.getDocumentType() != DocumentType.INVOICE)
		{
			return;
		}

		if (userInput.containsKey("invoiceId"))
		{
			document.setInvoiceId((String)userInput.get("invoiceId"));
		}

		if (userInput.containsKey("orderNumber"))
		{
			document.setOrderNumber((String)userInput.get("orderNumber"));
		}

		if (userInput.containsKey("dueDate") && userInput.get("dueDate") != null)
		{
			String dueDateStr = userInput.get("dueDate").toString();
			if (!dueDateStr.isBlank())
			{
				LocalDate dueDate = LocalDate.parse(dueDateStr);
				document.setDueDate(dueDate.atStartOfDay(ZoneId.systemDefault()).toInstant());
			}
		}

		if (userInput.containsKey("amountDue") && userInput.get("amountDue") != null)
		{
			String amountDueStr = userInput.get("amountDue").toString();
			if (!amountDueStr.isBlank())
			{
				document.setAmountDue(new BigDecimal(amountDueStr));
			}
		}
	}

	/**
	 * Updates document tags based on comma-separated input string.
	 *
	 * @param document
	 *            the document to update tags for
	 * @param tagsInput
	 *            comma-separated tag names
	 */
	public void updateTags(Document document, String tagsInput)
	{
		if (tagsInput == null || tagsInput.isBlank())
		{
			// Clear all manual tags but keep AI tags
			document.getDocumentTags().removeIf(dt -> dt.getSource() == TagSource.MANUAL);
			return;
		}

		// Parse comma-separated tags
		Set<String> tagNames = Arrays.stream(tagsInput.split(","))
			.map(String::trim)
			.filter(s -> !s.isEmpty())
			.collect(Collectors.toSet());

		// Find or create tags
		Set<Tag> newTags = tagRepository.findOrCreateTags(tagNames);

		// Remove manual tags not in new set (preserve AI tags)
		document.getDocumentTags().removeIf(dt -> dt.getSource() == TagSource.MANUAL
			&& !newTags.stream().anyMatch(tag -> tag.getName().equalsIgnoreCase(dt.getName())));

		// Add new tags as MANUAL
		for (Tag tag : newTags)
		{
			document.addTag(tag, TagSource.MANUAL);
		}

		LOG.debugf("Updated tags for document %s: %s", document.getId(), tagNames);
	}

	/**
	 * Parses a date string (yyyy-MM-dd) to Instant at start of day.
	 *
	 * @param dateStr
	 *            the date string
	 * @return Instant or null if string is blank
	 */
	public Instant parseDate(String dateStr)
	{
		if (dateStr == null || dateStr.isBlank())
		{
			return null;
		}
		LocalDate date = LocalDate.parse(dateStr);
		return date.atStartOfDay(ZoneId.systemDefault()).toInstant();
	}
}
