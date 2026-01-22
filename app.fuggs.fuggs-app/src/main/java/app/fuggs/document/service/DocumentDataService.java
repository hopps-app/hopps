package app.fuggs.document.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import app.fuggs.document.domain.Document;
import app.fuggs.document.domain.TagSource;
import app.fuggs.document.domain.TradeParty;
import app.fuggs.shared.domain.Tag;
import app.fuggs.shared.repository.TagRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.slf4j.Logger;

import static org.slf4j.LoggerFactory.getLogger;

@ApplicationScoped
public class DocumentDataService
{
	private static final Logger LOG = getLogger(DocumentDataService.class);
	public static final String KEY_TOTAL = "total";
	public static final String KEY_TRANSACTION_DATE = "transactionDate";
	public static final String KEY_CURRENCY_CODE = "currencyCode";
	public static final String KEY_PRIVATELY_PAID = "privatelyPaid";

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
		LOG.info("Applying form data directly to document: documentId={}", document.getId());

		// Extract and apply core fields
		if (userInput.containsKey(KEY_TOTAL) && userInput.get(KEY_TOTAL) != null)
		{
			String totalStr = userInput.get(KEY_TOTAL).toString();
			if (!totalStr.isBlank())
			{
				document.setTotal(new BigDecimal(totalStr));
			}
		}

		if (userInput.containsKey("name"))
		{
			document.setName((String)userInput.get("name"));
		}

		if (userInput.containsKey(KEY_TRANSACTION_DATE) && userInput.get(KEY_TRANSACTION_DATE) != null)
		{
			String dateStr = userInput.get(KEY_TRANSACTION_DATE).toString();
			if (!dateStr.isBlank())
			{
				LocalDate date = LocalDate.parse(dateStr);
				document.setTransactionTime(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
			}
		}

		if (userInput.containsKey(KEY_CURRENCY_CODE))
		{
			document.setCurrencyCode((String)userInput.get(KEY_CURRENCY_CODE));
		}

		if (userInput.containsKey(KEY_PRIVATELY_PAID))
		{
			boolean privatelyPaid = Boolean.parseBoolean(userInput.get(KEY_PRIVATELY_PAID).toString());
			document.setPrivatelyPaid(privatelyPaid);
		}

		// Sender information
		applySenderData(document, userInput);

		LOG.info("Form data applied successfully: documentId={}", document.getId());
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
				sender.setOrganization(document.getOrganization());
				document.setSender(sender);
			}

			sender.setName(senderName);
			sender.setStreet(senderStreet);
			sender.setZipCode(senderZipCode);
			sender.setCity(senderCity);
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
			&& newTags.stream().noneMatch(tag -> tag.getName().equalsIgnoreCase(dt.getName())));

		// Add new tags as MANUAL
		for (Tag tag : newTags)
		{
			document.addTag(tag, TagSource.MANUAL);
		}

		LOG.debug("Updated tags for document {}: {}", document.getId(), tagNames);
	}

	/**
	 * Parses a date string (yyyy-MM-dd) to Instant at start of day.
	 *
	 * @param dateStr
	 *            the date string
	 * @return Instant or null if the string is blank
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
