package app.hopps.transaction.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.transaction.api.dto.TransactionCreateRequest;
import app.hopps.transaction.domain.Transaction;
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
                "EUR", null, null, null, true,
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
                "2025-03-15", null, null, false,
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
                null, "2025-06-01", null, false,
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
                null, null, null, false,
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
                "  ", "  ", null, false,
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
                null, null, 42L, false,
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
                null, null, null, false,
                null, null, null, null, null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNull(transaction.getBommel());
        verifyNoInteractions(bommelRepository);
    }

    @Test
    @DisplayName("should store counterparty as recipient and organization as sender for income")
    void shouldCreateCounterpartyForIncome() {
        // Positive total => income: the counterparty is the recipient, the organization is the sender.
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, false,
                "ACME Corp", "Main Street 1", "12345", "Berlin",
                null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNotNull(transaction.getCounterparty());
        assertEquals("ACME Corp", transaction.getCounterparty().getName());
        assertEquals("Main Street 1", transaction.getCounterparty().getStreet());
        assertEquals("12345", transaction.getCounterparty().getZipCode());
        assertEquals("Berlin", transaction.getCounterparty().getCity());
        assertEquals(organization, transaction.getCounterparty().getOrganization());
        // income => counterparty on recipient side, organization on sender side
        assertSame(transaction.getRecipient(), transaction.getCounterparty());
        assertNotNull(transaction.getSender());
        assertEquals("Test Org", transaction.getSender().getName());
    }

    @Test
    @DisplayName("should store counterparty as sender and organization as recipient for an expense")
    void shouldCreateCounterpartyForExpense() {
        // Negative total => expense: the counterparty is the sender, the organization is the recipient.
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN.negate(), null, null,
                null, null, null, false,
                "ACME Corp", "Main Street 1", "12345", "Berlin",
                null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNotNull(transaction.getCounterparty());
        assertEquals("ACME Corp", transaction.getCounterparty().getName());
        // expense => counterparty on sender side, organization on recipient side
        assertSame(transaction.getSender(), transaction.getCounterparty());
        assertNotNull(transaction.getRecipient());
        assertEquals("Test Org", transaction.getRecipient().getName());
    }

    @Test
    @DisplayName("should not create counterparty when name is null but still record organization")
    void shouldNotCreateCounterpartyWhenNameNull() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, false,
                null, "Main Street 1", "12345", "Berlin",
                null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNull(transaction.getCounterparty());
        // income => organization is recorded on the sender side even without a counterparty
        assertNotNull(transaction.getSender());
        assertEquals("Test Org", transaction.getSender().getName());
    }

    @Test
    @DisplayName("should not create counterparty when name is blank but still record organization")
    void shouldNotCreateCounterpartyWhenNameBlank() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, false,
                "  ", "Main Street 1", "12345", "Berlin",
                null);

        converter.applyRequestToTransaction(transaction, request, organization);

        assertNull(transaction.getCounterparty());
        assertNotNull(transaction.getSender());
        assertEquals("Test Org", transaction.getSender().getName());
    }

    @Test
    @DisplayName("should set tags")
    void shouldSetTags() {
        var request = new TransactionCreateRequest(
                "Test", BigDecimal.TEN, null, null,
                null, null, null, false,
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
                null, null, null, false,
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
                null, null, null, false,
                null, null, null, null, List.of());

        Set<String> tagsBefore = transaction.getTags();
        converter.applyRequestToTransaction(transaction, request, organization);

        assertSame(tagsBefore, transaction.getTags());
    }
}
