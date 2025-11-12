package app.hopps.document.domain;

import app.hopps.transaction.domain.TradeParty;
import app.hopps.transaction.domain.TransactionRecord;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

public record InvoiceData(
        BigDecimal total,
        LocalDate invoiceDate,
        String currencyCode,
        Optional<String> customerName,
        Optional<String> purchaseOrderNumber,
        Optional<String> invoiceId,
        Optional<LocalDate> dueDate,
        Optional<BigDecimal> amountDue,
        Optional<TradeParty> sender,
        Optional<TradeParty> receiver) implements Data {

    public InvoiceData(BigDecimal total, LocalDate invoiceDate, String currencyCode) {
        this(total, invoiceDate, currencyCode,
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty());
    }

    @Override
    public void updateTransactionRecord(TransactionRecord transactionRecord) {
        transactionRecord.setTotal(this.total());

        // Required
        transactionRecord.setTransactionTime(this.invoiceDate().atStartOfDay(ZoneId.systemDefault()).toInstant());
        transactionRecord.setCurrencyCode(this.currencyCode());

        // Optional
        this.customerName().ifPresent(transactionRecord::setName);

        this.sender().ifPresent(transactionRecord::setSender);
        this.receiver().ifPresent(transactionRecord::setRecipient);

        this.purchaseOrderNumber().ifPresent(transactionRecord::setOrderNumber);
        this.invoiceId().ifPresent(transactionRecord::setInvoiceId);
        this.dueDate()
                .ifPresent(
                        dueDate -> transactionRecord
                                .setDueDate(dueDate.atStartOfDay(ZoneId.systemDefault()).toInstant()));
        this.amountDue().ifPresent(transactionRecord::setAmountDue);
    }
}
