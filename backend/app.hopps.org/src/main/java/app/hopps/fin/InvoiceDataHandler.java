package app.hopps.fin;

import app.hopps.fin.jpa.entities.TransactionRecord;
import app.hopps.fin.model.Data;
import app.hopps.fin.model.InvoiceData;
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

        data.sender().ifPresent(transactionRecord::setSender);
        data.receiver().ifPresent(transactionRecord::setRecipient);

        data.purchaseOrderNumber().ifPresent(transactionRecord::setOrderNumber);
        data.invoiceId().ifPresent(transactionRecord::setInvoiceId);
        data.dueDate()
                .ifPresent(
                        dueDate -> transactionRecord
                                .setDueDate(dueDate.atStartOfDay(ZoneId.systemDefault()).toInstant()));
        data.amountDue().ifPresent(transactionRecord::setAmountDue);
    }
}
