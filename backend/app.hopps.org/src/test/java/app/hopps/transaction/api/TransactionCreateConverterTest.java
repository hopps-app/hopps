package app.hopps.transaction.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.category.domain.Category;
import app.hopps.category.repository.CategoryRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.transaction.api.dto.TransactionCreateRequest;
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
class TransactionCreateConverterTest {

    @Mock
    BommelRepository bommelRepository;

    @Mock
    CategoryRepository categoryRepository;

    @InjectMocks
    TransactionCreateConverter converter;

    private Organization organization;
    private Transaction transaction;

    @BeforeEach
    void setUp() {
        organization = new Organization();
        organization.setName("Test Org");

        transaction = new Transaction();
    }

    @Test
    @DisplayName("should apply all basic fields from create request")
    void shouldApplyAllBasicFields() {
        var request = new TransactionCreateRequest(
                "Test Transaction", BigDecimal.valueOf(100.50), BigDecimal.valueOf(19.00),
                "EUR", null, null, null, null, null, true,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertEquals("Test Transaction", transaction.getName());
        assertEquals(BigDecimal.valueOf(100.50), transaction.getTotal());
        assertEquals(BigDecimal.valueOf(19.00), transaction.getTotalTax());
        assertEquals("EUR", transaction.getCurrencyCode());
        assertTrue(transaction.isPrivatelyPaid());
    }

    @Test
    @DisplayName("should parse and set transaction date")
    void shouldParseTransactionDate() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                "2025-03-15", null, null, null, null, false,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNotNull(transaction.getTransactionTime());
        LocalDate result = transaction.getTransactionTime().atZone(ZoneId.systemDefault()).toLocalDate();
        assertEquals(LocalDate.of(2025, 3, 15), result);
    }

    @Test
    @DisplayName("should parse and set due date")
    void shouldParseDueDate() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, "2025-06-01", null, null, null, false,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNotNull(transaction.getDueDate());
        LocalDate result = transaction.getDueDate().atZone(ZoneId.systemDefault()).toLocalDate();
        assertEquals(LocalDate.of(2025, 6, 1), result);
    }

    @Test
    @DisplayName("should skip null transaction date")
    void shouldSkipNullTransactionDate() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, null, null, false,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNull(transaction.getTransactionTime());
        assertNull(transaction.getDueDate());
    }

    @Test
    @DisplayName("should skip blank transaction date")
    void shouldSkipBlankTransactionDate() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                "  ", "  ", null, null, null, false,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNull(transaction.getTransactionTime());
        assertNull(transaction.getDueDate());
    }

    @Test
    @DisplayName("should look up and set bommel")
    void shouldLookUpAndSetBommel() {
        Bommel bommel = new Bommel();
        bommel.setName("Marketing");
        when(bommelRepository.findById(42L)).thenReturn(bommel);

        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, 42L, null, null, false,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertEquals(bommel, transaction.getBommel());
        verify(bommelRepository).findById(42L);
    }

    @Test
    @DisplayName("should not look up bommel when id is null")
    void shouldNotLookUpBommelWhenNull() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, null, null, false,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNull(transaction.getBommel());
        verifyNoInteractions(bommelRepository);
    }

    @Test
    @DisplayName("should look up and set category")
    void shouldLookUpAndSetCategory() {
        Category category = new Category();
        category.setName("Office Supplies");
        when(categoryRepository.findById(7L)).thenReturn(category);

        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, 7L, null, false,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertEquals(category, transaction.getCategory());
        verify(categoryRepository).findById(7L);
    }

    @Test
    @DisplayName("should not look up category when id is null")
    void shouldNotLookUpCategoryWhenNull() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, null, null, false,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNull(transaction.getCategory());
        verifyNoInteractions(categoryRepository);
    }

    @Test
    @DisplayName("should set transaction area")
    void shouldSetTransactionArea() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, null, "ideell", false,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertEquals(TransactionArea.IDEELL, transaction.getArea());
    }

    @Test
    @DisplayName("should skip null area")
    void shouldSkipNullArea() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, null, null, false,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNull(transaction.getArea());
    }

    @Test
    @DisplayName("should skip blank area")
    void shouldSkipBlankArea() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, null, "  ", false,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNull(transaction.getArea());
    }

    @Test
    @DisplayName("should create sender trade party with organization")
    void shouldCreateSenderTradeParty() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, null, null, false,
                "ACME Corp", "Main Street 1", "12345", "Berlin",
                null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNotNull(transaction.getSender());
        assertEquals("ACME Corp", transaction.getSender().getName());
        assertEquals("Main Street 1", transaction.getSender().getStreet());
        assertEquals("12345", transaction.getSender().getZipCode());
        assertEquals("Berlin", transaction.getSender().getCity());
        assertEquals(organization, transaction.getSender().getOrganization());
    }

    @Test
    @DisplayName("should not create sender when name is null")
    void shouldNotCreateSenderWhenNameNull() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, null, null, false,
                null, "Main Street 1", "12345", "Berlin",
                null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNull(transaction.getSender());
    }

    @Test
    @DisplayName("should not create sender when name is blank")
    void shouldNotCreateSenderWhenNameBlank() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, null, null, false,
                "  ", "Main Street 1", "12345", "Berlin",
                null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNull(transaction.getSender());
    }

    @Test
    @DisplayName("should set tags")
    void shouldSetTags() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, null, null, false,
                null, null, null, null,
                List.of("urgent", "office"));

        converter.applyRequestToTransaction(transaction, request, organization);

        assertEquals(Set.of("urgent", "office"), transaction.getTags());
    }

    @Test
    @DisplayName("should not modify tags when list is null")
    void shouldNotModifyTagsWhenNull() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, null, null, false,
                null, null, null, null, null);

        Set<String> tagsBefore = transaction.getTags();
        converter.applyRequestToTransaction(transaction, request, organization);

        assertSame(tagsBefore, transaction.getTags());
    }

    @Test
    @DisplayName("should not modify tags when list is empty")
    void shouldNotModifyTagsWhenEmpty() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, null, null, false,
                null, null, null, null, List.of());

        Set<String> tagsBefore = transaction.getTags();
        converter.applyRequestToTransaction(transaction, request, organization);

        assertSame(tagsBefore, transaction.getTags());
    }
}
