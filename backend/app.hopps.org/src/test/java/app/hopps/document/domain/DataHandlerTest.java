package app.hopps.document.domain;

import app.hopps.document.domain.DocumentType;
import app.hopps.document.domain.InvoiceData;
import app.hopps.document.domain.ReceiptData;
import app.hopps.transaction.domain.TradeParty;
import app.hopps.transaction.domain.TransactionRecord;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@TestSecurity(user = "alice")
class DataHandlerTest {

    @Test
    void shouldWriteFullInvoiceData() {
        // given
        var transaction = createTransactionRecord();
        LocalDate dueDate = LocalDate.now().plusDays(3);
        InvoiceData invoiceData = new InvoiceData(
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
        invoiceData.updateTransactionRecord(transaction);

        // then
        assertEquals("CustomerName", transaction.getName());
        assertEquals(dueDate.atStartOfDay(ZoneId.systemDefault()).toInstant(), transaction.getDueDate());
        assertEquals("Country", transaction.getSender().getCountry());
    }

    @Test
    @TestTransaction
    void shouldWriteMinimalReceiptData() {
        // given
        var transaction = createTransactionRecord();
        ReceiptData receiptData = new ReceiptData(BigDecimal.valueOf(100));

        // when
        receiptData.updateTransactionRecord(transaction);

        // then
        assertEquals(BigDecimal.valueOf(100), transaction.getTotal());
    }

    @Test
    void shouldWriteFullReceiptData() {
        // given
        var transactionRecord = createTransactionRecord();
        LocalDateTime transactionTime = LocalDateTime.now();

        ReceiptData receiptData = new ReceiptData(
                BigDecimal.valueOf(100),
                Optional.of("StoreName"),
                Optional.of(getTradeParty()),
                Optional.of(transactionTime));

        // when
        receiptData.updateTransactionRecord(transactionRecord);

        // then
        assertEquals("StoreName", transactionRecord.getName());
        assertEquals("City", transactionRecord.getSender().getCity());
        assertEquals(transactionTime.atOffset(ZoneOffset.UTC).toInstant().truncatedTo(ChronoUnit.SECONDS),
                transactionRecord.getTransactionTime().truncatedTo(ChronoUnit.SECONDS));
    }

    private static TransactionRecord createTransactionRecord() {
        TransactionRecord transactionRecord = new TransactionRecord(BigDecimal.TEN, DocumentType.INVOICE, "alice");
        transactionRecord.setDocumentKey("randomKey");

        return transactionRecord;
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
