package app.hopps.model;

import com.azure.ai.documentintelligence.models.Document;
import com.azure.ai.documentintelligence.models.DocumentField;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;
import java.util.Optional;

public record ReceiptData(
    Optional<Double> subTotal,
    double total,
    Optional<String> storeName,
    Optional<Address> storeAddress,
    Optional<LocalDateTime> transactionTime
) {
    public static ReceiptData fromDocument(Document document) {
        Map<String, DocumentField> fields = document.getFields();

        DocumentField transactionTime = fields.get("TransactionTime");

        LocalTime time = transactionTime == null ?
                LocalTime.MIDNIGHT
                : LocalTime.parse(transactionTime.getValueTime());

        return new ReceiptData(
            Optional.ofNullable(fields.get("Subtotal")).map(t -> t.getValueCurrency().getAmount()),
            fields.get("Total").getValueCurrency().getAmount(),
            fields.get("MerchantName").getValueString(),
            Address.fromAzure(fields.get("MerchantAddress").getValueAddress()),
            fields.get("TransactionDate").getValueDate()
                .atTime(time)
        );
    }
}
