package app.hopps.fin;

import app.hopps.fin.jpa.entities.TransactionRecord;
import app.hopps.fin.model.Data;
import app.hopps.fin.model.ReceiptData;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.ZoneOffset;

@ApplicationScoped
public class ReceiptDataHandler extends AbstractDataHandler {

    @Override
    protected void updateData(TransactionRecord transactionRecord, Data data) {
        if (data instanceof ReceiptData receiptData) {
            handleReceipt(transactionRecord, receiptData);
        }
    }

    private void handleReceipt(TransactionRecord transactionRecord, ReceiptData data) {
        transactionRecord.setTotal(data.total());

        // Optional
        data.storeName().ifPresent(transactionRecord::setName);
        data.storeAddress().ifPresent(transactionRecord::setSender);
        data.transactionTime()
                .ifPresent(
                        transactionTime -> transactionRecord
                                .setTransactionTime(transactionTime.toInstant(ZoneOffset.UTC)));
    }
}
