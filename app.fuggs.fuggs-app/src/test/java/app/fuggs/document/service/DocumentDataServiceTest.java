package app.fuggs.document.service;

import app.fuggs.document.domain.Document;
import app.fuggs.document.domain.TagSource;
import app.fuggs.document.domain.TradeParty;
import app.fuggs.shared.domain.Tag;
import app.fuggs.shared.repository.TagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentDataServiceTest
{
	@Mock
	TagRepository tagRepository;

	@InjectMocks
	DocumentDataService documentDataService;

	private Document document;
	private Map<String, Object> userInput;

	@BeforeEach
	void setUp()
	{
		document = new Document();
		document.id = 123L;
		userInput = new HashMap<>();
	}

	@Test
	void shouldApplyAllFormData()
	{
		// Given
		userInput.put("total", "150.50");
		userInput.put("name", "Test Invoice");
		userInput.put("transactionDate", "2024-03-15");
		userInput.put("currencyCode", "USD");
		userInput.put("privatelyPaid", "true");
		userInput.put("senderName", "Acme Corp");
		userInput.put("senderStreet", "123 Main St");
		userInput.put("senderZipCode", "12345");
		userInput.put("senderCity", "Springfield");

		// When
		documentDataService.applyFormData(document, userInput);

		// Then
		assertEquals(new BigDecimal("150.50"), document.getTotal());
		assertEquals("Test Invoice", document.getName());
		assertNotNull(document.getTransactionTime());
		assertEquals("USD", document.getCurrencyCode());
		assertTrue(document.isPrivatelyPaid());

		assertNotNull(document.getSender());
		assertEquals("Acme Corp", document.getSender().getName());
		assertEquals("123 Main St", document.getSender().getStreet());
		assertEquals("12345", document.getSender().getZipCode());
		assertEquals("Springfield", document.getSender().getCity());
	}

	@Test
	void shouldHandlePartialFormData()
	{
		// Given
		userInput.put("total", "100.00");
		userInput.put("name", "Partial Data");

		// When
		documentDataService.applyFormData(document, userInput);

		// Then
		assertEquals(new BigDecimal("100.00"), document.getTotal());
		assertEquals("Partial Data", document.getName());
		assertNull(document.getCurrencyCode());
		assertFalse(document.isPrivatelyPaid());
	}

	@Test
	void shouldUpdateTagsWithNewTags()
	{
		// Given
		String tagsInput = "office, supplies, urgent";
		Tag tag1 = new Tag();
		tag1.setName("office");
		Tag tag2 = new Tag();
		tag2.setName("supplies");
		Tag tag3 = new Tag();
		tag3.setName("urgent");

		when(tagRepository.findOrCreateTags(any())).thenReturn(Set.of(tag1, tag2, tag3));

		// When
		documentDataService.updateTags(document, tagsInput);

		// Then
		assertEquals(3, document.getDocumentTags().size());
		verify(tagRepository).findOrCreateTags(any());
	}

	@Test
	void shouldClearTagsWhenInputIsBlank()
	{
		// Given
		Tag existingTag = new Tag();
		existingTag.setName("existing");
		document.addTag(existingTag, TagSource.MANUAL);

		// When
		documentDataService.updateTags(document, "");

		// Then
		assertEquals(0, document.getDocumentTags().size());
	}

	@Test
	void shouldClearTagsWhenInputIsNull()
	{
		// Given
		Tag existingTag = new Tag();
		existingTag.setName("existing");
		document.addTag(existingTag, TagSource.MANUAL);

		// When
		documentDataService.updateTags(document, null);

		// Then
		assertEquals(0, document.getDocumentTags().size());
	}

	@Test
	void shouldPreserveAiTagsWhenUpdating()
	{
		// Given
		Tag aiTag = new Tag();
		aiTag.setName("ai-tag");
		aiTag.id = 1L;
		document.addTag(aiTag, TagSource.AI);

		Tag manualTag = new Tag();
		manualTag.setName("manual");
		manualTag.id = 2L;

		when(tagRepository.findOrCreateTags(any())).thenReturn(Set.of(manualTag));

		// When
		documentDataService.updateTags(document, "manual");

		// Then
		// Should have both AI tag (preserved) and manual tag
		assertEquals(2, document.getDocumentTags().size());
		assertTrue(document.getDocumentTags().stream()
			.anyMatch(dt -> dt.getSource() == TagSource.AI && dt.getName().equals("ai-tag")));
		assertTrue(document.getDocumentTags().stream()
			.anyMatch(dt -> dt.getSource() == TagSource.MANUAL && dt.getName().equals("manual")));
	}

	@Test
	void shouldParseDateCorrectly()
	{
		// Given
		String dateStr = "2024-03-15";

		// When
		Instant result = documentDataService.parseDate(dateStr);

		// Then
		assertNotNull(result);
		LocalDate parsedDate = result.atZone(ZoneId.systemDefault()).toLocalDate();
		assertEquals(LocalDate.of(2024, 3, 15), parsedDate);
	}

	@Test
	void shouldReturnNullForBlankDate()
	{
		// When
		Instant result = documentDataService.parseDate("");

		// Then
		assertNull(result);
	}

	@Test
	void shouldReturnNullForNullDate()
	{
		// When
		Instant result = documentDataService.parseDate(null);

		// Then
		assertNull(result);
	}

	@Test
	void shouldHandlePrivatelyPaidFalse()
	{
		// Given
		userInput.put("privatelyPaid", "false");

		// When
		documentDataService.applyFormData(document, userInput);

		// Then
		assertFalse(document.isPrivatelyPaid());
	}

	@Test
	void shouldDefaultPrivatelyPaidToFalse()
	{
		// When - no privatelyPaid in input
		documentDataService.applyFormData(document, userInput);

		// Then
		assertFalse(document.isPrivatelyPaid());
	}

	@Test
	void shouldHandleBlankTotal()
	{
		// Given
		userInput.put("total", "");

		// When
		documentDataService.applyFormData(document, userInput);

		// Then
		assertNull(document.getTotal());
	}

	@Test
	void shouldHandleBlankTransactionDate()
	{
		// Given
		userInput.put("transactionDate", "");

		// When
		documentDataService.applyFormData(document, userInput);

		// Then
		assertNull(document.getTransactionTime());
	}

	@Test
	void shouldUpdateExistingSenderWithoutReplacing()
	{
		// Given - document already has a sender
		TradeParty existingSender = new TradeParty();
		existingSender.setName("Old Company");
		existingSender.setStreet("Old Street");
		document.setSender(existingSender);

		userInput.put("senderName", "New Company");
		userInput.put("senderStreet", "New Street");
		userInput.put("senderZipCode", "54321");
		userInput.put("senderCity", "New City");

		// When
		documentDataService.applyFormData(document, userInput);

		// Then - sender should be updated, not replaced
		TradeParty sender = document.getSender();
		assertNotNull(sender);
		assertEquals("New Company", sender.getName());
		assertEquals("New Street", sender.getStreet());
		assertEquals("54321", sender.getZipCode());
		assertEquals("New City", sender.getCity());
		// Verify it's the same instance, not a new one
		assertTrue(sender == existingSender);
	}

	@Test
	void shouldNotCreateSenderWhenAllFieldsBlank()
	{
		// Given - all sender fields are blank strings
		userInput.put("senderName", "");
		userInput.put("senderStreet", "");
		userInput.put("senderZipCode", "");
		userInput.put("senderCity", "");

		// When
		documentDataService.applyFormData(document, userInput);

		// Then - sender should remain null
		assertNull(document.getSender());
	}

	@Test
	void shouldNotCreateSenderWhenAllFieldsNull()
	{
		// Given - all sender fields are null
		userInput.put("senderName", null);
		userInput.put("senderStreet", null);
		userInput.put("senderZipCode", null);
		userInput.put("senderCity", null);

		// When
		documentDataService.applyFormData(document, userInput);

		// Then - sender should remain null
		assertNull(document.getSender());
	}

	@Test
	void shouldCreateSenderWithPartialData()
	{
		// Given - only sender name provided, other fields blank
		userInput.put("senderName", "Partial Corp");
		userInput.put("senderStreet", "");
		userInput.put("senderZipCode", null);

		// When
		documentDataService.applyFormData(document, userInput);

		// Then - sender should be created with available data
		assertNotNull(document.getSender());
		assertEquals("Partial Corp", document.getSender().getName());
		assertEquals("", document.getSender().getStreet());
		assertNull(document.getSender().getZipCode());
		assertNull(document.getSender().getCity());
	}

	@Test
	void shouldHandleNullValuesInUserInput()
	{
		// Given - null values in map (not missing keys)
		userInput.put("total", null);
		userInput.put("name", null);
		userInput.put("transactionDate", null);
		userInput.put("currencyCode", null);

		// When
		documentDataService.applyFormData(document, userInput);

		// Then - null values should be handled gracefully
		assertNull(document.getTotal());
		assertNull(document.getName());
		assertNull(document.getTransactionTime());
		assertNull(document.getCurrencyCode());
	}

	@Test
	void shouldIgnoreEmptyTagsInCommaSeparatedList()
	{
		// Given - tags with empty entries between commas
		String tagsInput = "tag1,,tag2,,,tag3";
		Tag tag1 = new Tag();
		tag1.setName("tag1");
		Tag tag2 = new Tag();
		tag2.setName("tag2");
		Tag tag3 = new Tag();
		tag3.setName("tag3");

		when(tagRepository.findOrCreateTags(any())).thenReturn(Set.of(tag1, tag2, tag3));

		// When
		documentDataService.updateTags(document, tagsInput);

		// Then - should only create 3 tags, ignoring empty strings
		assertEquals(3, document.getDocumentTags().size());
	}

	@Test
	void shouldHandleTagsWithOnlyWhitespaceAndCommas()
	{
		// Given - input with only whitespace and commas
		String tagsInput = " , , , ";

		// When
		documentDataService.updateTags(document, tagsInput);

		// Then - should clear all manual tags (no valid tags to create)
		assertEquals(0, document.getDocumentTags().size());
	}

	@Test
	void shouldHandleWhitespaceOnlyDate()
	{
		// Given
		String dateStr = "   ";

		// When
		Instant result = documentDataService.parseDate(dateStr);

		// Then
		assertNull(result);
	}

	@Test
	void shouldHandleBlankCurrencyCode()
	{
		// Given
		userInput.put("currencyCode", "");

		// When
		documentDataService.applyFormData(document, userInput);

		// Then
		assertEquals("", document.getCurrencyCode());
	}

	@Test
	void shouldHandleBlankName()
	{
		// Given
		userInput.put("name", "");

		// When
		documentDataService.applyFormData(document, userInput);

		// Then
		assertEquals("", document.getName());
	}
}
