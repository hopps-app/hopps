package app.hopps.fin;

import app.hopps.commons.Data;
import app.hopps.commons.InvoiceData;
import app.hopps.fin.jpa.entities.TransactionRecord;
import app.hopps.fin.kafka.model.AddressHelper;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.ZoneId;

@ApplicationScoped
@SuppressWarnings("java:S3740")
public class InvoiceDataHandler extends AbstractDataHandler {
    @Override
    protected void updateData(TransactionRecord transactionRecord, Data data) {
        if (data instanceof InvoiceData invoiceData) {
            handleInvoice(transactionRecord, invoiceData);
        }
    }

    private void handleInvoice(TransactionRecord transactionRecord, InvoiceData data) {
        transactionRecord.setTotal(data.total());

        // Required
        transactionRecord.setTransactionTime(data.invoiceDate().atStartOfDay(ZoneId.systemDefault()).toInstant());
        transactionRecord.setCurrencyCode(data.currencyCode());

        // Optional
        data.customerName().ifPresent(transactionRecord::setName);
        data.billingAddress().ifPresent(address -> transactionRecord.setSender(AddressHelper.convertToJpa(address)));
        data.purchaseOrderNumber().ifPresent(transactionRecord::setOrderNumber);
        data.invoiceId().ifPresent(transactionRecord::setInvoiceId);
        data.dueDate()
                .ifPresent(
                        dueDate -> transactionRecord
                                .setDueDate(dueDate.atStartOfDay(ZoneId.systemDefault()).toInstant()));
        data.amountDue().ifPresent(transactionRecord::setAmountDue);
    }
}
