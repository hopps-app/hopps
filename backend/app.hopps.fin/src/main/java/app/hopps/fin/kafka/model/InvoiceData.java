package app.hopps.fin.kafka.model;

import app.hopps.fin.jpa.TransactionRecordConverter;
import app.hopps.fin.jpa.entities.TransactionRecord;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

public record InvoiceData(
        Optional<String> customerName,
        Optional<Address> billingAddress,
        Optional<String> purchaseOrderNumber,
        Optional<String> invoiceId,
        LocalDate invoiceDate,
        Optional<LocalDate> dueDate,
        Optional<BigDecimal> subTotal,
        BigDecimal total,
        Optional<BigDecimal> amountDue,
        String currencyCode) implements TransactionRecordConverter {

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
        dueDate().ifPresent(dueDate -> transactionRecord.setDueDate(dueDate.atStartOfDay(ZoneId.systemDefault()).toInstant()));
        subTotal().ifPresent(transactionRecord::setSubTotal);
        amountDue().ifPresent(transactionRecord::setAmountDue);

        return transactionRecord;
    }
}
