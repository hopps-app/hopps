package app.hopps.model;

import com.azure.ai.documentintelligence.models.Document;
import com.azure.ai.documentintelligence.models.DocumentField;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.Map;
import java.util.Optional;

public class ReceiptDataHelper {
    private ReceiptDataHelper() {
        // only call the static method
    }

    public static app.hopps.commons.ReceiptData fromDocument(Long referenceKey, Document document) {
        Map<String, DocumentField> fields = document.getFields();

        DocumentField transactionTime = fields.get("TransactionTime");

        LocalTime time = transactionTime == null ? LocalTime.MIDNIGHT
                : LocalTime.parse(transactionTime.getValueTime());

        return new app.hopps.commons.ReceiptData(
                referenceKey,
                BigDecimal.valueOf(fields.get("Total").getValueCurrency().getAmount()),
                Optional.ofNullable(fields.get("MerchantName")).map(DocumentField::getValueString),
                Optional.ofNullable(fields.get("MerchantAddress"))
                        .map(DocumentField::getValueAddress)
                        .map(AddressHelper::fromAzure),
                Optional.ofNullable(fields.get("TransactionDate"))
                        .map(DocumentField::getValueDate)
                        .map(t -> t.atTime(time)));
    }
}
