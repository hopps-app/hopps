package app.hopps.az.document.ai.model;

import com.azure.ai.documentintelligence.models.AnalyzedDocument;
import com.azure.ai.documentintelligence.models.DocumentField;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.Map;
import java.util.Optional;

public class ReceiptDataHelper {
    private ReceiptDataHelper() {
        // only call the static method
    }

    public static ReceiptData fromDocument(AnalyzedDocument document) {
        Map<String, DocumentField> fields = document.getFields();

        DocumentField transactionTime = fields.get("TransactionTime");

        LocalTime time = transactionTime == null ? LocalTime.MIDNIGHT
                : LocalTime.parse(transactionTime.getValueTime());

        return new ReceiptData(
                BigDecimal.valueOf(fields.get("Total").getValueCurrency().getAmount()),
                Optional.ofNullable(fields.get("MerchantName")).map(DocumentField::getValueString),
                Optional.ofNullable(fields.get("MerchantAddress"))
                        .map(DocumentField::getValueAddress)
                        .map(TradePartyHelper::fromAzure),
                Optional.ofNullable(fields.get("TransactionDate"))
                        .map(DocumentField::getValueDate)
                        .map(t -> t.atTime(time)));
    }
}
