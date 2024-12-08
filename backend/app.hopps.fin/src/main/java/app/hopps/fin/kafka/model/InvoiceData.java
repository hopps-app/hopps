package app.hopps.fin.kafka.model;

import app.hopps.fin.jpa.TransactionRecordConverter;
import app.hopps.fin.jpa.entities.TransactionRecord;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

public record InvoiceData(
        BigDecimal total,
        LocalDate invoiceDate,
        String currencyCode,
        Optional<String> customerName,
        Optional<Address> billingAddress,
        Optional<String> purchaseOrderNumber,
        Optional<String> invoiceId,
        Optional<LocalDate> dueDate,
        Optional<BigDecimal> subTotal,
        Optional<BigDecimal> amountDue) implements TransactionRecordConverter {

    public InvoiceData(BigDecimal total, LocalDate invoiceDate, String currencyCode) {
        this(total, invoiceDate, currencyCode, Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(),
                Optional.empty(), Optional.empty(), Optional.empty());
    }

    @Override
    public TransactionRecord convertToTransactionRecord() {
        TransactionRecord transactionRecord = new TransactionRecord(total());
        // Required
        transactionRecord.setTransactionTime(invoiceDate().atStartOfDay(ZoneId.systemDefault()).toInstant());
        transactionRecord.setCurrencyCode(currencyCode());

        // Optional
        customerName().ifPresent(transactionRecord::setName);
        billingAddress().ifPresent(address -> transactionRecord.setAddress(address.convertToJpa()));
        purchaseOrderNumber().ifPresent(transactionRecord::setOrderNumber);
        invoiceId().ifPresent(transactionRecord::setInvoiceId);
        dueDate().ifPresent(
                dueDate -> transactionRecord.setDueDate(dueDate.atStartOfDay(ZoneId.systemDefault()).toInstant()));
        subTotal().ifPresent(transactionRecord::setSubTotal);
        amountDue().ifPresent(transactionRecord::setAmountDue);

        return transactionRecord;
    }
}
