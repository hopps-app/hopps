package app.hopps.model;

import com.azure.ai.documentintelligence.models.Document;
import com.azure.ai.documentintelligence.models.DocumentField;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;

public record ReceiptData(
    double subTotal,
    double total,
    String storeName,
    String storeAddress,
    LocalDateTime transactionTime
) {
    public static ReceiptData fromDocument(Document document) {
        Map<String, DocumentField> fields = document.getFields();

        return new ReceiptData(
            fields.get("Subtotal").getValueNumber(),
            fields.get("Total").getValueNumber(),
            fields.get("MerchantName").getValueString(),
            fields.get("MerchantAddress").getValueAddress().toString(),
            fields.get("TransactionDate").getValueDate()
                .atTime(LocalTime.parse(fields.get("TransactionTime").getValueTime()))
        );
    }
}
