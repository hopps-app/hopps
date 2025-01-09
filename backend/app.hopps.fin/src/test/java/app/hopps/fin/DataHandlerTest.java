package app.hopps.fin;

import app.hopps.commons.Address;
import app.hopps.commons.DocumentType;
import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@TestSecurity(user = "alice")
class DataHandlerTest {

    private static final Address address = new Address("Country", "ZipCode", "State", "City", "Street", "StreetNumber");

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
    @TestTransaction
    void shouldWriteFullInvoiceData() {

        // given
        LocalDate dueDate = LocalDate.now().plusDays(3);
        InvoiceData invoiceData = new InvoiceData(
                referenceKey,
                BigDecimal.valueOf(500),
                LocalDate.now(),
                "EUR",
                Optional.of("CustomerName"),
                Optional.of(address),
                Optional.of("pruchaseOrderNumber"),
                Optional.of("invoiceId"),
                Optional.of(dueDate),
                Optional.of(BigDecimal.valueOf(150)));

        // when
        invoiceDataHandler.handleData(invoiceData);

        // then
        List<TransactionRecord> transactionRecords = repository.listAll();
        assertEquals(1, transactionRecords.size());

        TransactionRecord transactionRecord = transactionRecords.getFirst();
        assertEquals("CustomerName", transactionRecord.getName());
        assertEquals(dueDate.atStartOfDay(ZoneId.systemDefault()).toInstant(), transactionRecord.getDueDate());
        assertEquals("State", transactionRecord.getSender().getState());
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
    @TestTransaction
    void shouldWriteFullReceiptData() {
        // given
        LocalDateTime transactionTime = LocalDateTime.now();

        ReceiptData receiptData = new ReceiptData(
                referenceKey,
                BigDecimal.valueOf(100),
                Optional.of("StoreName"),
                Optional.of(address),
                Optional.of(transactionTime));

        // when
        receiptDataHandler.handleData(receiptData);

        // then
        List<TransactionRecord> transactionRecords = repository.listAll();
        assertEquals(1, transactionRecords.size());

        TransactionRecord transactionRecord = transactionRecords.getFirst();
        assertEquals("StoreName", transactionRecord.getName());
        assertEquals("City", transactionRecord.getSender().getCity());
        assertEquals(transactionTime.atOffset(ZoneOffset.UTC).toInstant(), transactionRecord.getTransactionTime());
    }
}
