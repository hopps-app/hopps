package app.hopps.document.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import app.hopps.document.domain.Document;
import app.hopps.document.domain.TagSource;
import app.hopps.shared.domain.Tag;
import app.hopps.shared.repository.TagRepository;

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
}
