package app.hopps.fin;

import app.hopps.commons.Data;
import app.hopps.commons.ReceiptData;
import app.hopps.fin.jpa.entities.TradePartyHelper;
import app.hopps.fin.jpa.entities.TransactionRecord;
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
        data.storeAddress().ifPresent(addrees -> transactionRecord.setSender(TradePartyHelper.convertToJpa(addrees)));
        data.transactionTime()
                .ifPresent(
                        transactionTime -> transactionRecord
                                .setTransactionTime(transactionTime.toInstant(ZoneOffset.UTC)));
    }
}
