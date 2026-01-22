package app.fuggs.document.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import app.fuggs.document.client.DocumentData;
import app.fuggs.document.client.TradePartyData;
import app.fuggs.document.domain.Document;
import app.fuggs.document.domain.TagSource;
import app.fuggs.document.domain.TradeParty;
import app.fuggs.shared.domain.Tag;
import app.fuggs.shared.repository.TagRepository;

class DocumentDataApplierTest
{
	@Mock
	TagRepository tagRepository;

	@InjectMocks
	DocumentDataApplier applier;

	private Document document;

	@BeforeEach
	void setUp()
	{
		MockitoAnnotations.openMocks(this);
		document = new Document();
	}

	// Helper method to create DocumentData with all null fields except
	// specified ones
	private DocumentData createDocumentData(
		BigDecimal total,
		String currencyCode,
		LocalDate date,
		LocalTime time,
		String documentId,
		String merchantName,
		TradePartyData merchantAddress,
		String customerName,
		BigDecimal totalTax,
		String purchaseOrderNumber,
		List<String> tags)
	{
		return new DocumentData(
			total,
			currencyCode,
			date,
			time,
			documentId,
			merchantName,
			merchantAddress,
			null, // merchantTaxId
			customerName,
			null, // customerId
			null, // customerAddress
			null, // billingAddress
			null, // shippingAddress
			null, // subTotal
			totalTax,
			null, // totalDiscount
			null, // previousUnpaidBalance
			purchaseOrderNumber,
			null, // paymentTerm
			null, // serviceStartDate
			null, // serviceEndDate
			tags);
	}

	private TradePartyData createTradePartyData(String name, String street, String postalCode, String city)
	{
		return new TradePartyData(
			name,
			null, // countryOrRegion
			postalCode,
			null, // state
			city,
			street,
			null, // additionalAddress
			null, // taxID
			null, // vatID
			null); // description
	}

	@Test
	void shouldReturnZeroWhenDocumentDataIsNull()
	{
		// given
		// document is empty (from setUp)

		// when
		int fieldsUpdated = applier.applyDocumentData(document, null, TagSource.AI);

		// then
		assertEquals(0, fieldsUpdated);
	}

	@Test
	void shouldApplyTotalWhenDocumentTotalIsNull()
	{
		// given
		DocumentData data = createDocumentData(
			BigDecimal.valueOf(100.50),
			null, null, null, null, null, null, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(1, fieldsUpdated);
		assertEquals(BigDecimal.valueOf(100.50), document.getTotal());
	}

	@Test
	void shouldApplyTotalWhenDocumentTotalIsZero()
	{
		// given
		document.setTotal(BigDecimal.ZERO);
		DocumentData data = createDocumentData(
			BigDecimal.valueOf(100.50),
			null, null, null, null, null, null, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(1, fieldsUpdated);
		assertEquals(BigDecimal.valueOf(100.50), document.getTotal());
	}

	@Test
	void shouldNotApplyTotalWhenDocumentAlreadyHasNonZeroTotal()
	{
		// given
		document.setTotal(BigDecimal.valueOf(50.00));
		DocumentData data = createDocumentData(
			BigDecimal.valueOf(100.50),
			null, null, null, null, null, null, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(0, fieldsUpdated);
		assertEquals(BigDecimal.valueOf(50.00), document.getTotal());
	}

	@Test
	void shouldApplyCurrencyCode()
	{
		// given
		DocumentData data = createDocumentData(
			null, "EUR", null, null, null, null, null, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(1, fieldsUpdated);
		assertEquals("EUR", document.getCurrencyCode());
	}

	@Test
	void shouldNotApplyCurrencyCodeWhenAlreadySet()
	{
		// given
		document.setCurrencyCode("USD");
		DocumentData data = createDocumentData(
			null, "EUR", null, null, null, null, null, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(0, fieldsUpdated);
		assertEquals("USD", document.getCurrencyCode());
	}

	@Test
	void shouldApplyTransactionTimeWithDate()
	{
		// given
		LocalDate date = LocalDate.of(2024, 12, 27);
		DocumentData data = createDocumentData(
			null, null, date, null, null, null, null, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(1, fieldsUpdated);
		assertNotNull(document.getTransactionTime());

		Instant expected = date.atTime(LocalTime.MIDNIGHT)
			.atZone(ZoneId.systemDefault())
			.toInstant();
		assertEquals(expected, document.getTransactionTime());
	}

	@Test
	void shouldApplyTransactionTimeWithDateAndTime()
	{
		// given
		LocalDate date = LocalDate.of(2024, 12, 27);
		LocalTime time = LocalTime.of(14, 30);
		DocumentData data = createDocumentData(
			null, null, date, time, null, null, null, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(1, fieldsUpdated);
		assertNotNull(document.getTransactionTime());

		Instant expected = date.atTime(time)
			.atZone(ZoneId.systemDefault())
			.toInstant();
		assertEquals(expected, document.getTransactionTime());
	}

	@Test
	void shouldApplyTotalTax()
	{
		// given
		DocumentData data = createDocumentData(
			null, null, null, null, null, null, null, null, BigDecimal.valueOf(19.00), null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(1, fieldsUpdated);
		assertEquals(BigDecimal.valueOf(19.00), document.getTotalTax());
	}

	@Test
	void shouldApplySenderWithFullAddress()
	{
		// given
		TradePartyData merchantAddress = createTradePartyData("ACME Corp", "123 Main St", "12345", "Berlin");
		DocumentData data = createDocumentData(
			null, null, null, null, null, null, merchantAddress, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(1, fieldsUpdated);
		assertNotNull(document.getSender());
		assertEquals("ACME Corp", document.getSender().getName());
		assertEquals("123 Main St", document.getSender().getStreet());
		assertEquals("12345", document.getSender().getZipCode());
		assertEquals("Berlin", document.getSender().getCity());
	}

	@Test
	void shouldApplySenderWithMerchantNameOverride()
	{
		// given
		TradePartyData merchantAddress = createTradePartyData("Address Name", "123 Main St", "12345", "Berlin");
		DocumentData data = createDocumentData(
			null, null, null, null, null, "Merchant Override", merchantAddress, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		// Applies both sender and document name (2 fields)
		assertEquals(2, fieldsUpdated);
		assertNotNull(document.getSender());
		assertEquals("Merchant Override", document.getSender().getName());
		assertEquals("123 Main St", document.getSender().getStreet());
		assertEquals("Merchant Override", document.getName());
	}

	@Test
	void shouldApplySenderNameOnlyWhenNoAddress()
	{
		// given
		DocumentData data = createDocumentData(
			null, null, null, null, null, "Merchant Name Only", null, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		// Applies both sender and document name (2 fields)
		assertEquals(2, fieldsUpdated);
		assertNotNull(document.getSender());
		assertEquals("Merchant Name Only", document.getSender().getName());
		assertNull(document.getSender().getStreet());
		assertEquals("Merchant Name Only", document.getName());
	}

	@Test
	void shouldNotApplySenderWhenAlreadySet()
	{
		// given
		TradeParty existingSender = new TradeParty();
		existingSender.setName("Existing Sender");
		document.setSender(existingSender);

		TradePartyData merchantAddress = createTradePartyData("New Sender", "123 Main St", "12345", "Berlin");
		DocumentData data = createDocumentData(
			null, null, null, null, null, null, merchantAddress, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(0, fieldsUpdated);
		assertEquals("Existing Sender", document.getSender().getName());
	}

	@Test
	void shouldApplyDocumentNameFromMerchant()
	{
		// given
		DocumentData data = createDocumentData(
			null, null, null, null, null, "Merchant Name", null, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		// Applies both sender (name only) and document name (2 fields)
		assertEquals(2, fieldsUpdated);
		assertEquals("Merchant Name", document.getName());
		assertEquals("Merchant Name", document.getSender().getName());
	}

	@Test
	void shouldApplyDocumentNameFromCustomerWhenNoMerchant()
	{
		// given
		DocumentData data = createDocumentData(
			null, null, null, null, null, null, null, "Customer Name", null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(1, fieldsUpdated);
		assertEquals("Customer Name", document.getName());
	}

	@Test
	void shouldPreferMerchantNameOverCustomerNameForDocumentName()
	{
		// given
		DocumentData data = createDocumentData(
			null, null, null, null, null, "Merchant Name", null, "Customer Name", null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		// Applies both sender and document name (2 fields), prefers merchant
		// name
		assertEquals(2, fieldsUpdated);
		assertEquals("Merchant Name", document.getName());
		assertEquals("Merchant Name", document.getSender().getName());
	}

	@Test
	void shouldNotApplyDocumentNameWhenAlreadySet()
	{
		// given
		document.setName("Existing Name");
		DocumentData data = createDocumentData(
			null, null, null, null, null, "Merchant Name", null, null, null, null, null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		// Applies only sender (1 field), name is already set
		assertEquals(1, fieldsUpdated);
		assertEquals("Existing Name", document.getName());
		assertEquals("Merchant Name", document.getSender().getName());
	}

	@Test
	void shouldApplyTags()
	{
		// given
		List<String> tagNames = List.of("essen", "pizza", "restaurant");
		Tag tag1 = new Tag("essen");
		Tag tag2 = new Tag("pizza");
		Tag tag3 = new Tag("restaurant");
		Set<Tag> tags = Set.of(tag1, tag2, tag3);

		when(tagRepository.findOrCreateTags(any())).thenReturn(tags);

		DocumentData data = createDocumentData(
			null, null, null, null, null, null, null, null, null, null, tagNames);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(1, fieldsUpdated);
		assertEquals(3, document.getDocumentTags().size());
		verify(tagRepository).findOrCreateTags(any(HashSet.class));
	}

	@Test
	void shouldNotApplyTagsWhenDocumentAlreadyHasTags()
	{
		// given
		// Add existing tag to document
		Tag existingTag = new Tag("existing");
		document.addTag(existingTag, TagSource.MANUAL);

		List<String> tagNames = List.of("new-tag");
		DocumentData data = createDocumentData(
			null, null, null, null, null, null, null, null, null, null, tagNames);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(0, fieldsUpdated);
		assertEquals(1, document.getDocumentTags().size());
		verify(tagRepository, never()).findOrCreateTags(any());
	}

	@Test
	void shouldNotApplyTagsWhenTagsListIsEmpty()
	{
		// given
		DocumentData data = createDocumentData(
			null, null, null, null, null, null, null, null, null, null, List.of());

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		assertEquals(0, fieldsUpdated);
		verify(tagRepository, never()).findOrCreateTags(any());
	}

	@Test
	void shouldApplyMultipleFields()
	{
		// given
		LocalDate date = LocalDate.of(2024, 12, 27);
		DocumentData data = createDocumentData(
			BigDecimal.valueOf(100.50),
			"EUR",
			date,
			null,
			"INV-001",
			"Test Merchant",
			null,
			null,
			BigDecimal.valueOf(19.00),
			null,
			null);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		// Should update: total, currency, date, sender, document name, totalTax
		assertEquals(6, fieldsUpdated);
		assertEquals(BigDecimal.valueOf(100.50), document.getTotal());
		assertEquals("EUR", document.getCurrencyCode());
		assertEquals("Test Merchant", document.getName());
		assertEquals(BigDecimal.valueOf(19.00), document.getTotalTax());
		assertNotNull(document.getTransactionTime());
	}

	@Test
	void shouldApplyAllFieldsWhenDocumentIsEmpty()
	{
		// given
		LocalDate date = LocalDate.of(2024, 12, 27);
		LocalTime time = LocalTime.of(14, 30);
		TradePartyData merchantAddress = createTradePartyData("ACME", "Main St", "12345", "Berlin");
		List<String> tagNames = List.of("tag1");

		Tag tag1 = new Tag("tag1");
		when(tagRepository.findOrCreateTags(any())).thenReturn(Set.of(tag1));

		DocumentData data = createDocumentData(
			BigDecimal.valueOf(100.50),
			"EUR",
			date,
			time,
			"INV-001",
			"Test Merchant",
			merchantAddress,
			null,
			BigDecimal.valueOf(19.00),
			"PO-123",
			tagNames);

		// when
		int fieldsUpdated = applier.applyDocumentData(document, data, TagSource.AI);

		// then
		// Should update all applicable fields
		assertTrue(fieldsUpdated >= 6); // At least 6 fields should be updated
		assertEquals(BigDecimal.valueOf(100.50), document.getTotal());
		assertEquals("EUR", document.getCurrencyCode());
		assertEquals(BigDecimal.valueOf(19.00), document.getTotalTax());
		assertNotNull(document.getTransactionTime());
		assertNotNull(document.getSender());
		assertEquals("Test Merchant", document.getSender().getName());
		assertEquals(1, document.getDocumentTags().size());
	}
}
