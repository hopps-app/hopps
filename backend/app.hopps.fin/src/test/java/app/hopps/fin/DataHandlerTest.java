package app.hopps.fin;

import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import app.hopps.fin.kafka.model.Address;
import app.hopps.fin.kafka.model.InvoiceData;
import app.hopps.fin.kafka.model.ReceiptData;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
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
@TestSecurity(authorizationEnabled = false)
class DataHandlerTest {
    private final static Address address = new Address("Country", "ZipCode", "State", "City", "Street", "StreetNumber");

    @Inject
    DataHandler dataHandler;

    @Inject
    TransactionRecordRepository repository;

    @Test
    @TestTransaction
    void shouldWriteMinimalInvoiceData() {
        // given
        InvoiceData invoiceData = new InvoiceData(
                BigDecimal.valueOf(500),
                LocalDate.now(),
                "EUR");

        // when
        dataHandler.processTransactionRecord(invoiceData);

        // then
        assertEquals(1, repository.count());
    }

    @Test
    @TestTransaction
    void shouldWriteFullInvoiceData() {
        // given
        LocalDate dueDate = LocalDate.now().plusDays(3);
        InvoiceData invoiceData = new InvoiceData(
                BigDecimal.valueOf(500),
                LocalDate.now(),
                "EUR",
                Optional.of("CustomerName"),
                Optional.of(address),
                Optional.of("pruchaseOrderNumber"),
                Optional.of("invoiceId"),
                Optional.of(dueDate),
                Optional.of(BigDecimal.valueOf(350)),
                Optional.of(BigDecimal.valueOf(150)));

        // when
        dataHandler.processTransactionRecord(invoiceData);

        // then
        List<TransactionRecord> transactionRecords = repository.listAll();
        assertEquals(1, transactionRecords.size());

        TransactionRecord record = transactionRecords.getFirst();
        assertEquals("CustomerName", record.getName());
        assertEquals(dueDate.atStartOfDay(ZoneId.systemDefault()).toInstant(), record.getDueDate());
        assertEquals("State", record.getAddress().getState());
    }

    @Test
    @TestTransaction
    void shouldWriteMinimalReceiptData() {
        // given
        ReceiptData receiptData = new ReceiptData(BigDecimal.valueOf(100));

        // when
        dataHandler.processTransactionRecord(receiptData);

        // then
        assertEquals(1, repository.count());
    }

    @Test
    @TestTransaction
    void shouldWriteFullReceiptData() {
        // given
        LocalDateTime transactionTime = LocalDateTime.now();

        ReceiptData receiptData = new ReceiptData(
                BigDecimal.valueOf(100),
                Optional.of(BigDecimal.valueOf(75)),
                Optional.of("StoreName"),
                Optional.of(address),
                Optional.of(transactionTime));

        // when
        dataHandler.processTransactionRecord(receiptData);

        // then
        List<TransactionRecord> transactionRecords = repository.listAll();
        assertEquals(1, transactionRecords.size());

        TransactionRecord record = transactionRecords.getFirst();
        assertEquals("StoreName", record.getName());
        assertEquals("City", record.getAddress().getCity());
        assertEquals(transactionTime.atOffset(ZoneOffset.UTC).toInstant(), record.getTransactionTime());
    }
}
