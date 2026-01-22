package app.fuggs.document.service;

import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.fuggs.document.client.DocumentData;
import app.fuggs.document.client.TradePartyData;
import app.fuggs.document.domain.Document;
import app.fuggs.document.domain.TagSource;
import app.fuggs.document.domain.TradeParty;
import app.fuggs.shared.domain.Tag;
import app.fuggs.shared.repository.TagRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Service that applies extracted DocumentData to a Document entity. Handles
 * autofilling fields, mapping trade parties, and applying tags.
 */
@ApplicationScoped
public class DocumentDataApplier
{
	private static final Logger LOG = LoggerFactory.getLogger(DocumentDataApplier.class);

	@Inject
	TagRepository tagRepository;

	/**
	 * Apply extracted document data to a document entity. Only fills fields
	 * that are currently null or zero.
	 *
	 * @param document
	 *            The document to update
	 * @param data
	 *            The extracted data to apply
	 * @param tagSource
	 *            The source to use when applying tags (AI or MANUAL)
	 * @return Number of fields that were updated
	 */
	public int applyDocumentData(Document document, DocumentData data, TagSource tagSource)
	{
		if (data == null)
		{
			LOG.warn("DocumentData is null, nothing to apply");
			return 0;
		}

		int fieldsUpdated = 0;

		fieldsUpdated += applyTotal(document, data);
		fieldsUpdated += applyCurrencyCode(document, data);
		fieldsUpdated += applyTransactionTime(document, data);
		fieldsUpdated += applyTotalTax(document, data);
		fieldsUpdated += applySender(document, data);
		fieldsUpdated += applyDocumentName(document, data);
		fieldsUpdated += applyTags(document, data, tagSource);

		LOG.info("Applied document data: documentId={}, fieldsUpdated={}", document.getId(), fieldsUpdated);
		return fieldsUpdated;
	}

	private int applyTotal(Document document, DocumentData data)
	{
		if (data.total() != null
			&& (document.getTotal() == null || java.math.BigDecimal.ZERO.compareTo(document.getTotal()) == 0))
		{
			document.setTotal(data.total());
			LOG.debug("Autofilled total: {}", data.total());
			return 1;
		}
		return 0;
	}

	private int applyCurrencyCode(Document document, DocumentData data)
	{
		if (data.currencyCode() != null && document.getCurrencyCode() == null)
		{
			document.setCurrencyCode(data.currencyCode());
			LOG.debug("Autofilled currencyCode: {}", data.currencyCode());
			return 1;
		}
		return 0;
	}

	private int applyTransactionTime(Document document, DocumentData data)
	{
		if (data.date() != null && document.getTransactionTime() == null)
		{
			LocalTime time = data.time() != null ? data.time() : LocalTime.MIDNIGHT;
			document.setTransactionTime(data.date()
				.atTime(time)
				.atZone(ZoneId.systemDefault())
				.toInstant());
			LOG.debug("Autofilled transactionTime: {} {}", data.date(), time);
			return 1;
		}
		return 0;
	}

	private int applyTotalTax(Document document, DocumentData data)
	{
		if (data.totalTax() != null && document.getTotalTax() == null)
		{
			document.setTotalTax(data.totalTax());
			LOG.debug("Autofilled totalTax: {}", data.totalTax());
			return 1;
		}
		return 0;
	}

	private int applySender(Document document, DocumentData data)
	{
		if (document.getSender() != null)
		{
			return 0;
		}

		if (data.merchantAddress() != null)
		{
			TradeParty sender = mapTradeParty(data.merchantAddress(), document);
			if (data.merchantName() != null)
			{
				sender.setName(data.merchantName());
			}
			document.setSender(sender);
			LOG.debug("Autofilled sender: {}", sender.getName());
			return 1;
		}
		else if (data.merchantName() != null)
		{
			TradeParty sender = new TradeParty();
			sender.setName(data.merchantName());
			sender.setOrganization(document.getOrganization());
			document.setSender(sender);
			LOG.debug("Autofilled sender name: {}", data.merchantName());
			return 1;
		}

		return 0;
	}

	private int applyDocumentName(Document document, DocumentData data)
	{
		if (document.getName() != null)
		{
			return 0;
		}

		if (data.merchantName() != null)
		{
			document.setName(data.merchantName());
			LOG.debug("Autofilled name from merchant: {}", data.merchantName());
			return 1;
		}
		else if (data.customerName() != null)
		{
			document.setName(data.customerName());
			LOG.debug("Autofilled name from customer: {}", data.customerName());
			return 1;
		}

		return 0;
	}

	private int applyTags(Document document, DocumentData data, TagSource tagSource)
	{
		if (data.tags() != null && !data.tags().isEmpty() && document.getDocumentTags().isEmpty())
		{
			Set<Tag> tags = tagRepository.findOrCreateTags(new HashSet<>(data.tags()));
			for (Tag tag : tags)
			{
				document.addTag(tag, tagSource);
			}
			LOG.info("Applied {} tags from {}: {}", tags.size(), tagSource, data.tags());
			return 1;
		}
		return 0;
	}

	private TradeParty mapTradeParty(TradePartyData data, Document document)
	{
		if (data == null)
		{
			return null;
		}

		TradeParty party = new TradeParty();
		party.setName(data.name());
		party.setStreet(data.street());
		party.setZipCode(data.postalCode());
		party.setCity(data.city());
		party.setOrganization(document.getOrganization());
		return party;
	}
}
