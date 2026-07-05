package app.hopps.document.service;

import app.hopps.document.client.DocumentData;
import app.hopps.document.client.TradePartyData;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.TagSource;
import app.hopps.document.repository.TradePartyRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.repository.TagRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

@ExtendWith(MockitoExtension.class)
class DocumentDataApplierTest {

    @Mock
    TagRepository tagRepository;

    @Mock
    TradePartyRepository tradePartyRepository;

    @Mock
    EntityManager entityManager;

    private DocumentDataApplier applier;
    private Document document;

    @BeforeEach
    void setUp() {
        applier = new DocumentDataApplier();
        applier.tagRepository = tagRepository;
        applier.tradePartyRepository = tradePartyRepository;
        applier.entityManager = entityManager;

        document = new Document();
        document.setOrganization(new Organization());
    }

    // Builds a DocumentData with only the merchant/customer fields set; everything else is null.
    private DocumentData parties(String merchantName, TradePartyData merchantAddress, String customerName,
            TradePartyData customerAddress) {
        return new DocumentData(
                null, null, null, null, null,
                merchantName, merchantAddress, null,
                customerName, null, customerAddress,
                null, null, null, null, null, null,
                null, null, null, null, null);
    }

    @Test
    @DisplayName("should store the extracted customer as the recipient (name only)")
    void appliesCustomerNameAsRecipient() {
        applier.applyDocumentData(document, parties(null, null, "Customer GmbH", null), TagSource.AI);

        assertNotNull(document.getRecipient());
        assertEquals("Customer GmbH", document.getRecipientName());
    }

    @Test
    @DisplayName("should store the extracted customer address as the recipient")
    void appliesCustomerAddressAsRecipient() {
        TradePartyData customer = new TradePartyData("Customer GmbH", null, "54321", null, "Munich", "Street 5", null,
                null, null, null);

        applier.applyDocumentData(document, parties(null, null, "Customer GmbH", customer), TagSource.AI);

        assertNotNull(document.getRecipient());
        assertEquals("Customer GmbH", document.getRecipientName());
        assertEquals("Munich", document.getRecipient().getCity());
    }

    @Test
    @DisplayName("should populate sender and recipient independently from merchant and customer")
    void appliesMerchantAsSenderAndCustomerAsRecipient() {
        TradePartyData merchant = new TradePartyData("Vendor Inc", null, "12345", null, "Berlin", "Main St 1", null,
                null, null, null);

        applier.applyDocumentData(document, parties("Vendor Inc", merchant, "Customer GmbH", null), TagSource.AI);

        assertEquals("Vendor Inc", document.getSenderName());
        assertEquals("Customer GmbH", document.getRecipientName());
    }

    @Test
    @DisplayName("should not create a recipient when no customer was extracted")
    void noRecipientWithoutCustomer() {
        applier.applyDocumentData(document, parties("Vendor Inc", null, null, null), TagSource.AI);

        assertNull(document.getRecipient());
    }
}
