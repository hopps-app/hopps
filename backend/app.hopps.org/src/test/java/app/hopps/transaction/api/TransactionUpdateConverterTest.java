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
                null, null, null, false, null, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals("Updated Name", transaction.getName());
    }

    @Test
    @DisplayName("should keep original name when null in request")
    void shouldKeepNameWhenNull() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false, null, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals("Original Name", transaction.getName());
    }

    @Test
    @DisplayName("should update total when provided")
    void shouldUpdateTotal() {
        var request = new TransactionUpdateRequest(
                null, BigDecimal.valueOf(200), null, null, null, null,
                null, null, null, false, null, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(BigDecimal.valueOf(200), transaction.getTotal());
    }

    @Test
    @DisplayName("should clear total when null in request")
    void shouldClearTotalWhenNull() {
        // A null total clears the amount: the frontend always sends the full form state, so null means "cleared"
        // (e.g. the analysed value was in the wrong currency and the correct euro amount isn't known yet).
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false, null, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNull(transaction.getTotal());
    }

    @Test
    @DisplayName("should update totalTax when provided")
    void shouldUpdateTotalTax() {
        var request = new TransactionUpdateRequest(
                null, null, BigDecimal.valueOf(38), null, null, null,
                null, null, null, false, null, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(BigDecimal.valueOf(38), transaction.getTotalTax());
    }

    @Test
    @DisplayName("should update currency code when provided")
    void shouldUpdateCurrencyCode() {
        var request = new TransactionUpdateRequest(
                null, null, null, "USD", null, null,
                null, null, null, false, null, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals("USD", transaction.getCurrencyCode());
    }

    @Test
    @DisplayName("should keep original currency code when null in request")
    void shouldKeepCurrencyCodeWhenNull() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false, null, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals("EUR", transaction.getCurrencyCode());
    }

    @Test
    @DisplayName("should always update privatelyPaid")
    void shouldAlwaysUpdatePrivatelyPaid() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, true, null, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertTrue(transaction.isPrivatelyPaid());
    }

    @Test
    @DisplayName("should parse and set transaction date")
    void shouldParseTransactionDate() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, "2025-04-20", null,
                null, null, null, false, null, null, null, null, null, null);

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
                null, null, null, false, null, null, null, null, null, null);

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
                null, null, null, false, null, null, null, null, null, null);

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
                10L, null, null, false, null, null, null, null, null, null);

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
                0L, null, null, false, null, null, null, null, null, null);

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
                null, null, null, false, null, null, null, null, null, null);

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
                null, 5L, null, false, null, null, null, null, null, null);

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
                null, 0L, null, false, null, null, null, null, null, null);

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
                null, null, null, false, null, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(existingCategory, transaction.getCategory());
        verifyNoInteractions(categoryRepository);
    }

    @Test
    @DisplayName("should set transaction area")
    void shouldSetTransactionArea() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, "wirtschaftlich", false, null, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(TransactionArea.WIRTSCHAFTLICH, transaction.getArea());
    }

    @Test
    @DisplayName("should skip null area")
    void shouldSkipNullArea() {
        transaction.setArea(TransactionArea.IDEELL);

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false, null, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(TransactionArea.IDEELL, transaction.getArea());
    }

    @Test
    @DisplayName("should skip blank area")
    void shouldSkipBlankArea() {
        transaction.setArea(TransactionArea.IDEELL);

        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, "  ", false, null, null, null, null, null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertEquals(TransactionArea.IDEELL, transaction.getArea());
    }

    @Test
    @DisplayName("should create counterparty (recipient for income) when transaction has none")
    void shouldCreateNewCounterparty() {
        // keep the transaction income (positive total); a null total would clear it and flip the direction
        var request = new TransactionUpdateRequest(
                null, BigDecimal.valueOf(50), null, null, null, null,
                null, null, null, false,
                "New Sender", "Street 1", "54321", "Munich",
                null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNotNull(transaction.getCounterparty());
        assertEquals("New Sender", transaction.getCounterparty().getName());
        assertEquals("Street 1", transaction.getCounterparty().getStreet());
        assertEquals("54321", transaction.getCounterparty().getZipCode());
        assertEquals("Munich", transaction.getCounterparty().getCity());
        assertEquals(organization, transaction.getCounterparty().getOrganization());
        // income (total 50) => counterparty on recipient side, organization on sender side
        assertSame(transaction.getRecipient(), transaction.getCounterparty());
        assertEquals("Test Org", transaction.getSender().getName());
    }

    @Test
    @DisplayName("should replace the counterparty with updated values")
    void shouldReplaceCounterparty() {
        TradeParty existing = new TradeParty();
        existing.setOrganization(organization);
        existing.setName("Old Sender");
        // income => the counterparty lives on the recipient side
        transaction.setRecipient(existing);

        // keep the transaction income (positive total); a null total would clear it and flip the direction
        var request = new TransactionUpdateRequest(
                null, BigDecimal.valueOf(50), null, null, null, null,
                null, null, null, false,
                "Updated Sender", "New Street 5", "99999", "Hamburg",
                null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNotNull(transaction.getCounterparty());
        assertEquals("Updated Sender", transaction.getCounterparty().getName());
        assertEquals("New Street 5", transaction.getCounterparty().getStreet());
        assertEquals("99999", transaction.getCounterparty().getZipCode());
        assertEquals("Hamburg", transaction.getCounterparty().getCity());
        assertEquals("Test Org", transaction.getSender().getName());
    }

    @Test
    @DisplayName("should not touch parties when name is null")
    void shouldNotTouchPartiesWhenNameNull() {
        // keep the transaction income (positive total); a null total would clear it and flip the direction
        var request = new TransactionUpdateRequest(
                null, BigDecimal.valueOf(50), null, null, null, null,
                null, null, null, false,
                null, "Street 1", "12345", "Berlin",
                null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNull(transaction.getCounterparty());
        assertNull(transaction.getSender());
        assertNull(transaction.getRecipient());
    }

    @Test
    @DisplayName("should not touch parties when name is blank")
    void shouldNotTouchPartiesWhenNameBlank() {
        // keep the transaction income (positive total); a null total would clear it and flip the direction
        var request = new TransactionUpdateRequest(
                null, BigDecimal.valueOf(50), null, null, null, null,
                null, null, null, false,
                "  ", "Street 1", "12345", "Berlin",
                null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        assertNull(transaction.getCounterparty());
        assertNull(transaction.getSender());
        assertNull(transaction.getRecipient());
    }

    @Test
    @DisplayName("should move counterparty to the other side when the direction flips to expense")
    void shouldMoveCounterpartyOnDirectionFlip() {
        TradeParty existing = new TradeParty();
        existing.setOrganization(organization);
        existing.setName("Contact");
        // starts as income (total 50) => counterparty on the recipient side
        transaction.setRecipient(existing);

        // flip to an expense without re-sending the counterparty name
        var request = new TransactionUpdateRequest(
                null, BigDecimal.valueOf(-99), null, null, null, null,
                null, null, null, false,
                null, null, null, null,
                null, null);

        converter.applyUpdateRequestToTransaction(transaction, request);

        // expense => counterparty now on the sender side, organization on the recipient side
        assertEquals("Contact", transaction.getCounterparty().getName());
        assertSame(transaction.getSender(), transaction.getCounterparty());
        assertEquals("Test Org", transaction.getRecipient().getName());
    }

    @Test
    @DisplayName("should set tags")
    void shouldSetTags() {
        var request = new TransactionUpdateRequest(
                null, null, null, null, null, null,
                null, null, null, false,
                null, null, null, null,
                List.of("new-tag", "important"), null);

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
                List.of(), null);

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
                null, null);

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
                List.of("tag1", "tag2"), null);

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
        // total 999 => income, so the counterparty is stored on the recipient side
        assertEquals("Full Sender", transaction.getCounterparty().getName());
        assertEquals(Set.of("tag1", "tag2"), transaction.getTags());
    }
}
