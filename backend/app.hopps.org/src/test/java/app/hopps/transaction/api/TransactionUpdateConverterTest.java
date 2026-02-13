package app.hopps.transaction.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.category.domain.Category;
import app.hopps.category.repository.CategoryRepository;
import app.hopps.document.domain.TradeParty;
import app.hopps.organization.domain.Organization;
import app.hopps.transaction.api.dto.TransactionUpdateRequest;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionArea;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionUpdateConverterTest {

    @Mock
    BommelRepository bommelRepository;

    @Mock
    CategoryRepository categoryRepository;

    @InjectMocks
    TransactionUpdateConverter converter;

    private Transaction transaction;
    private Organization organization;

    @BeforeEach
    void setUp() {
        organization = new Organization();
        organization.setName("Test Org");

        transaction = new Transaction();
        transaction.setOrganization(organization);
        transaction.setName("Original Name");
        transaction.setTotal(BigDecimal.valueOf(50));
        transaction.setCurrencyCode("EUR");
    }

    @Test
    @DisplayName("should update name when provided")
    void shouldUpdateName() {
        var request = new TransactionUpdateRequest(
                "Updated Name", null, null, null, null, null,
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals("Updated Name", transaction.getName());
    }

    @Test
    @DisplayName("should keep original name when null in request")
    void shouldKeepNameWhenNull() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals("Original Name", transaction.getName());
    }

    @Test
    @DisplayName("should update total when provided")
    void shouldUpdateTotal() {
        var request = new TransactionUpdateRequest(
                null, BigDecimal.valueOf(200), null, null, null, null,
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(BigDecimal.valueOf(200), transaction.getTotal());
    }

    @Test
    @DisplayName("should keep original total when null in request")
    void shouldKeepTotalWhenNull() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(BigDecimal.valueOf(50), transaction.getTotal());
    }

    @Test
    @DisplayName("should update totalTax when provided")
    void shouldUpdateTotalTax() {
        var request = new TransactionUpdateRequest(
                null, null, BigDecimal.valueOf(38), null, null, null,
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(BigDecimal.valueOf(38), transaction.getTotalTax());
    }

    @Test
    @DisplayName("should update currency code when provided")
    void shouldUpdateCurrencyCode() {
        var request = new TransactionUpdateRequest(
                null, null, null, "USD", null, null,
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals("USD", transaction.getCurrencyCode());
    }

    @Test
    @DisplayName("should keep original currency code when null in request")
    void shouldKeepCurrencyCodeWhenNull() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals("EUR", transaction.getCurrencyCode());
    }

    @Test
    @DisplayName("should always update privatelyPaid")
    void shouldAlwaysUpdatePrivatelyPaid() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, true, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertTrue(transaction.isPrivatelyPaid());
    }

    @Test
    @DisplayName("should parse and set transaction date")
    void shouldParseTransactionDate() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, "2025-04-20", null,
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNotNull(transaction.getTransactionTime());
        LocalDate result = transaction.getTransactionTime().atZone(ZoneId.systemDefault()).toLocalDate();
        assertEquals(LocalDate.of(2025, 4, 20), result);
    }

    @Test
    @DisplayName("should parse and set due date")
    void shouldParseDueDate() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, "2025-12-31",
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNotNull(transaction.getDueDate());
        LocalDate result = transaction.getDueDate().atZone(ZoneId.systemDefault()).toLocalDate();
        assertEquals(LocalDate.of(2025, 12, 31), result);
    }

    @Test
    @DisplayName("should skip blank dates")
    void shouldSkipBlankDates() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, "  ", "  ",
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNull(transaction.getTransactionTime());
        assertNull(transaction.getDueDate());
    }

    @Test
    @DisplayName("should look up and set bommel when id is positive")
    void shouldSetBommelWhenPositiveId() {
        Bommel bommel = new Bommel();
        bommel.setName("Finance");
        when(bommelRepository.findById(10L)).thenReturn(bommel);

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                10L, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(bommel, transaction.getBommel());
        verify(bommelRepository).findById(10L);
    }

    @Test
    @DisplayName("should clear bommel when id is zero or negative")
    void shouldClearBommelWhenZeroOrNegativeId() {
        Bommel existingBommel = new Bommel();
        transaction.setBommel(existingBommel);

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                0L, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNull(transaction.getBommel());
        verifyNoInteractions(bommelRepository);
    }

    @Test
    @DisplayName("should not touch bommel when id is null")
    void shouldNotTouchBommelWhenNull() {
        Bommel existingBommel = new Bommel();
        transaction.setBommel(existingBommel);

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(existingBommel, transaction.getBommel());
        verifyNoInteractions(bommelRepository);
    }

    @Test
    @DisplayName("should look up and set category when id is positive")
    void shouldSetCategoryWhenPositiveId() {
        Category category = new Category();
        category.setName("Travel");
        when(categoryRepository.findById(5L)).thenReturn(category);

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, 5L, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(category, transaction.getCategory());
        verify(categoryRepository).findById(5L);
    }

    @Test
    @DisplayName("should clear category when id is zero or negative")
    void shouldClearCategoryWhenZeroOrNegativeId() {
        Category existingCategory = new Category();
        transaction.setCategory(existingCategory);

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, 0L, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNull(transaction.getCategory());
        verifyNoInteractions(categoryRepository);
    }

    @Test
    @DisplayName("should not touch category when id is null")
    void shouldNotTouchCategoryWhenNull() {
        Category existingCategory = new Category();
        transaction.setCategory(existingCategory);

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(existingCategory, transaction.getCategory());
        verifyNoInteractions(categoryRepository);
    }

    @Test
    @DisplayName("should set transaction area")
    void shouldSetTransactionArea() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, "wirtschaftlich", false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(TransactionArea.WIRTSCHAFTLICH, transaction.getArea());
    }

    @Test
    @DisplayName("should skip null area")
    void shouldSkipNullArea() {
        transaction.setArea(TransactionArea.IDEELL);

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(TransactionArea.IDEELL, transaction.getArea());
    }

    @Test
    @DisplayName("should skip blank area")
    void shouldSkipBlankArea() {
        transaction.setArea(TransactionArea.IDEELL);

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, "  ", false, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(TransactionArea.IDEELL, transaction.getArea());
    }

    @Test
    @DisplayName("should create new sender when transaction has none")
    void shouldCreateNewSender() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false,
                "New Sender", "Street 1", "54321", "Munich",
                null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNotNull(transaction.getSender());
        assertEquals("New Sender", transaction.getSender().getName());
        assertEquals("Street 1", transaction.getSender().getStreet());
        assertEquals("54321", transaction.getSender().getZipCode());
        assertEquals("Munich", transaction.getSender().getCity());
        assertEquals(organization, transaction.getSender().getOrganization());
    }

    @Test
    @DisplayName("should update existing sender")
    void shouldUpdateExistingSender() {
        TradeParty existingSender = new TradeParty();
        existingSender.setOrganization(organization);
        existingSender.setName("Old Sender");
        transaction.setSender(existingSender);

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false,
                "Updated Sender", "New Street 5", "99999", "Hamburg",
                null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertSame(existingSender, transaction.getSender());
        assertEquals("Updated Sender", existingSender.getName());
        assertEquals("New Street 5", existingSender.getStreet());
        assertEquals("99999", existingSender.getZipCode());
        assertEquals("Hamburg", existingSender.getCity());
    }

    @Test
    @DisplayName("should not touch sender when name is null")
    void shouldNotTouchSenderWhenNameNull() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false,
                null, "Street 1", "12345", "Berlin",
                null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNull(transaction.getSender());
    }

    @Test
    @DisplayName("should not touch sender when name is blank")
    void shouldNotTouchSenderWhenNameBlank() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false,
                "  ", "Street 1", "12345", "Berlin",
                null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNull(transaction.getSender());
    }

    @Test
    @DisplayName("should set tags")
    void shouldSetTags() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false,
                null, null, null, null,
                List.of("new-tag", "important"));

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(Set.of("new-tag", "important"), transaction.getTags());
    }

    @Test
    @DisplayName("should clear tags with empty list")
    void shouldClearTagsWithEmptyList() {
        transaction.setTags(Set.of("old-tag"));

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false,
                null, null, null, null,
                List.of());

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertTrue(transaction.getTags().isEmpty());
    }

    @Test
    @DisplayName("should not touch tags when null in request")
    void shouldNotTouchTagsWhenNull() {
        Set<String> existingTags = Set.of("keep-me");
        transaction.setTags(existingTags);

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false,
                null, null, null, null,
                null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(Set.of("keep-me"), transaction.getTags());
    }

    @Test
    @DisplayName("should apply multiple fields at once")
    void shouldApplyMultipleFieldsAtOnce() {
        Bommel bommel = new Bommel();
        when(bommelRepository.findById(3L)).thenReturn(bommel);
        Category category = new Category();
        when(categoryRepository.findById(2L)).thenReturn(category);

        var request = new TransactionUpdateRequest(
                "Full Update", BigDecimal.valueOf(999), BigDecimal.valueOf(190), "USD",
                "2025-01-01", "2025-02-01",
                3L, 2L, "zweckbetrieb", true,
                "Full Sender", "All Street", "11111", "Frankfurt",
                List.of("tag1", "tag2"));

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals("Full Update", transaction.getName());
        assertEquals(BigDecimal.valueOf(999), transaction.getTotal());
        assertEquals(BigDecimal.valueOf(190), transaction.getTotalTax());
        assertEquals("USD", transaction.getCurrencyCode());
        assertTrue(transaction.isPrivatelyPaid());
        assertNotNull(transaction.getTransactionTime());
        assertNotNull(transaction.getDueDate());
        assertEquals(bommel, transaction.getBommel());
        assertEquals(category, transaction.getCategory());
        assertEquals(TransactionArea.ZWECKBETRIEB, transaction.getArea());
        assertEquals("Full Sender", transaction.getSender().getName());
        assertEquals(Set.of("tag1", "tag2"), transaction.getTags());
    }
}
