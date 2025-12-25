package app.hopps.document.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.domain.TradeParty;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

@QuarkusTest
@Tag("integration")
class DocumentTagServiceTest
{
	private static final Logger LOG = LoggerFactory.getLogger(DocumentTagServiceTest.class);

	@Inject
	DocumentTagService documentTagService;

	@Test
	void shouldGenerateTagsForPizzaRestaurantReceipt()
	{
		Document document = createPizzaReceipt();

		List<String> tags = documentTagService.tagDocument(document);

		LOG.info("Generated tags for pizza receipt: {}", tags);

		assertNotNull(tags);
		assertFalse(tags.isEmpty(), "Should generate at least one tag");

		// Normalize tags to lowercase for comparison (AI might not always
		// follow instructions)
		List<String> normalizedTags = tags.stream()
			.map(String::toLowerCase)
			.map(String::trim)
			.toList();

		// Should contain food-related tags
		boolean hasFoodRelatedTag = normalizedTags.stream()
			.anyMatch(tag -> tag.contains("food") || tag.contains("pizza")
				|| tag.contains("restaurant") || tag.contains("dining")
				|| tag.contains("italian") || tag.contains("meal"));
		assertTrue(hasFoodRelatedTag, "Should contain food-related tag, but got: " + tags);
	}

	@Test
	void shouldGenerateTagsForCloudServiceInvoice()
	{
		Document document = createCloudServiceInvoice();

		List<String> tags = documentTagService.tagDocument(document);

		LOG.info("Generated tags for cloud invoice: {}", tags);

		assertNotNull(tags);
		assertFalse(tags.isEmpty(), "Should generate at least one tag");

		// Normalize tags to lowercase for comparison
		List<String> normalizedTags = tags.stream()
			.map(String::toLowerCase)
			.map(String::trim)
			.toList();

		// Should contain tech/cloud-related tags
		boolean hasTechRelatedTag = normalizedTags.stream()
			.anyMatch(tag -> tag.contains("cloud") || tag.contains("server")
				|| tag.contains("hosting") || tag.contains("software")
				|| tag.contains("tech") || tag.contains("saas")
				|| tag.contains("aws") || tag.contains("web"));
		assertTrue(hasTechRelatedTag, "Should contain tech-related tag, but got: " + tags);
	}

	@Test
	void shouldGenerateTagsForOfficeSuppliesReceipt()
	{
		Document document = createOfficeSuppliesReceipt();

		List<String> tags = documentTagService.tagDocument(document);

		LOG.info("Generated tags for office supplies: {}", tags);

		assertNotNull(tags);
		assertFalse(tags.isEmpty(), "Should generate at least one tag");

		// Normalize tags to lowercase for comparison
		List<String> normalizedTags = tags.stream()
			.map(String::toLowerCase)
			.map(String::trim)
			.toList();

		// Should contain office-related tags
		boolean hasOfficeRelatedTag = normalizedTags.stream()
			.anyMatch(tag -> tag.contains("office") || tag.contains("supplies")
				|| tag.contains("stationery") || tag.contains("paper")
				|| tag.contains("equipment") || tag.contains("staples"));
		assertTrue(hasOfficeRelatedTag, "Should contain office-related tag, but got: " + tags);
	}

	private Document createPizzaReceipt()
	{
		Document document = new Document();
		document.setName("Pizzeria Bella Italia");
		document.setDocumentType(DocumentType.RECEIPT);
		document.setTotal(new BigDecimal("32.50"));
		document.setCurrencyCode("EUR");
		document.setTransactionTime(Instant.now());

		TradeParty sender = new TradeParty();
		sender.setName("Pizzeria Bella Italia");
		sender.setStreet("Hauptstraße 42");
		sender.setZipCode("80331");
		sender.setCity("München");
		document.setSender(sender);

		return document;
	}

	private Document createCloudServiceInvoice()
	{
		Document document = new Document();
		document.setName("AWS Monthly Invoice");
		document.setDocumentType(DocumentType.INVOICE);
		document.setTotal(new BigDecimal("245.99"));
		document.setCurrencyCode("USD");
		document.setTransactionTime(Instant.now());
		document.setInvoiceId("INV-2024-12345");

		TradeParty sender = new TradeParty();
		sender.setName("Amazon Web Services, Inc.");
		sender.setCity("Seattle");
		document.setSender(sender);

		return document;
	}

	private Document createOfficeSuppliesReceipt()
	{
		Document document = new Document();
		document.setName("Bürobedarf Einkauf");
		document.setDocumentType(DocumentType.RECEIPT);
		document.setTotal(new BigDecimal("89.90"));
		document.setCurrencyCode("EUR");
		document.setTransactionTime(Instant.now());

		TradeParty sender = new TradeParty();
		sender.setName("Staples Office Supplies");
		document.setSender(sender);

		return document;
	}
}
