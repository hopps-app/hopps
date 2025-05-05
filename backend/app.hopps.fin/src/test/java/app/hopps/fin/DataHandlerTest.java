package app.hopps.fin;

import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TradeParty;
import app.hopps.fin.jpa.entities.TransactionRecord;
import app.hopps.fin.model.Data;
import app.hopps.fin.model.DocumentType;
import app.hopps.fin.model.InvoiceData;
import app.hopps.fin.model.ReceiptData;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
@TestSecurity(user = "alice")
class DataHandlerTest {

    @Inject
    ReceiptDataHandler receiptDataHandler;

    @Inject
    TransactionRecordRepository repository;

    @Inject
    InvoiceDataHandler invoiceDataHandler;

    Long referenceKey;

    @BeforeEach
    @Transactional
    void setUp() {
        // although this test does not persist to db, other test might…
        repository.deleteAll();

        TransactionRecord transactionRecord = new TransactionRecord(BigDecimal.TEN, DocumentType.INVOICE, "alice");
        transactionRecord.setDocumentKey("randomKey");
        repository.persist(transactionRecord);
        referenceKey = transactionRecord.getId();
    }

    @Test
    @TestTransaction
    void shouldWriteMinimalInvoiceData() {

        // given
        InvoiceData invoiceData = new InvoiceData(
                referenceKey,
                BigDecimal.valueOf(500),
                LocalDate.now(),
                "EUR");

        // when
        invoiceDataHandler.handleData(invoiceData);

        // then
        assertEquals(1, repository.count());
    }

    @Test
    void shouldWriteFullInvoiceData() {

        // given
        LocalDate dueDate = LocalDate.now().plusDays(3);
        InvoiceData invoiceData = new InvoiceData(
                referenceKey,
                BigDecimal.valueOf(500),
                LocalDate.now(),
                "EUR",
                Optional.of("CustomerName"),
                Optional.of("pruchaseOrderNumber"),
                Optional.of("invoiceId"),
                Optional.of(dueDate),
                Optional.of(BigDecimal.valueOf(150)),
                Optional.of(getTradeParty()),
                Optional.empty());

        // when
        invoiceDataHandler.handleData(invoiceData);

        // then
        List<TransactionRecord> transactionRecords = repository.listAll();
        assertEquals(1, transactionRecords.size());

        TransactionRecord transactionRecord = transactionRecords.getFirst();
        assertEquals("CustomerName", transactionRecord.getName());
        assertEquals(dueDate.atStartOfDay(ZoneId.systemDefault()).toInstant(), transactionRecord.getDueDate());
        assertEquals("Country", transactionRecord.getSender().getCountry());
    }

    @Test
    @TestTransaction
    void shouldWriteMinimalReceiptData() {

        // given
        ReceiptData receiptData = new ReceiptData(referenceKey, BigDecimal.valueOf(100));

        // when
        receiptDataHandler.handleData(receiptData);

        // then
        assertEquals(1, repository.count());
    }

    @Test
    void shouldWriteFullReceiptData() {
        // given
        LocalDateTime transactionTime = LocalDateTime.now();

        ReceiptData receiptData = new ReceiptData(
                referenceKey,
                BigDecimal.valueOf(100),
                Optional.of("StoreName"),
                Optional.of(getTradeParty()),
                Optional.of(transactionTime));

        // when
        receiptDataHandler.handleData(receiptData);

        // then
        List<TransactionRecord> transactionRecords = repository.listAll();
        assertEquals(1, transactionRecords.size());

        TransactionRecord transactionRecord = transactionRecords.getFirst();
        assertEquals("StoreName", transactionRecord.getName());
        assertEquals("City", transactionRecord.getSender().getCity());
        assertEquals(transactionTime.atOffset(ZoneOffset.UTC).toInstant().truncatedTo(ChronoUnit.SECONDS),
                transactionRecord.getTransactionTime().truncatedTo(ChronoUnit.SECONDS));
    }

    @Test
    void shouldFailFindReferenceKey() {
        // given
        ReceiptData receiptData = new ReceiptData(
                999L,
                BigDecimal.valueOf(100),
                Optional.empty(),
                Optional.empty(),
                Optional.empty());

        // when
        assertThrows(IllegalStateException.class, () -> receiptDataHandler.handleData(receiptData));
    }

    @Test
    void shouldNotHandleData() {
        // given
        RandData randData = new RandData(referenceKey);

        // when
        assertDoesNotThrow(() -> receiptDataHandler.handleData(randData));
        assertDoesNotThrow(() -> invoiceDataHandler.handleData(randData));
    }

    record RandData(Long referenceKey) implements Data {
    }

    private static TradeParty getTradeParty() {
        var tradeParty = new TradeParty();
        tradeParty.setName("Name");
        tradeParty.setCountry("Country");
        tradeParty.setZipCode("ZipCode");
        tradeParty.setState("State");
        tradeParty.setCity("City");
        tradeParty.setAdditionalAddress("AdditionalAddress");
        tradeParty.setTaxID("TaxID");
        tradeParty.setVatID("VatID");
        tradeParty.setDescription("Description");
        return tradeParty;
    }
}
