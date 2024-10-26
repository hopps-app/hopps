package app.hopps.model;

import com.azure.ai.documentintelligence.models.CurrencyValue;
import com.azure.ai.documentintelligence.models.Document;
import com.azure.ai.documentintelligence.models.DocumentField;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;
import java.util.Optional;

public record ReceiptData(
        double total,
        Optional<Double> subTotal,
        Optional<String> storeName,
        Optional<Address> storeAddress,
        Optional<LocalDateTime> transactionTime) {
    public static ReceiptData fromDocument(Document document) {
        Map<String, DocumentField> fields = document.getFields();

        DocumentField transactionTime = fields.get("TransactionTime");

        LocalTime time = transactionTime == null ? LocalTime.MIDNIGHT
                : LocalTime.parse(transactionTime.getValueTime());

        return new ReceiptData(
                fields.get("Total").getValueCurrency().getAmount(),
                Optional.ofNullable(fields.get("Subtotal"))
                        .map(DocumentField::getValueCurrency)
                        .map(CurrencyValue::getAmount),
                Optional.ofNullable(fields.get("MerchantName")).map(DocumentField::getValueString),
                Optional.ofNullable(fields.get("MerchantAddress"))
                        .map(DocumentField::getValueAddress)
                        .map(Address::fromAzure),
                Optional.ofNullable(fields.get("TransactionDate"))
                        .map(DocumentField::getValueDate)
                        .map(t -> t.atTime(time)));
    }
}
