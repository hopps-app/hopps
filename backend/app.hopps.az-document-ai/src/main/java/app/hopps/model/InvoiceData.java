package app.hopps.model;

import com.azure.ai.documentintelligence.models.CurrencyValue;
import com.azure.ai.documentintelligence.models.Document;
import com.azure.ai.documentintelligence.models.DocumentField;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

public record InvoiceData(
        Optional<String> customerName,
        Optional<Address> billingAddress,
        Optional<String> purchaseOrderNumber,
        Optional<String> invoiceId,
        LocalDate invoiceDate,
        Optional<LocalDate> dueDate,
        Optional<Double> subTotal,
        double total,
        Optional<Double> amountDue,
        String currencyCode) {
    public static InvoiceData fromDocument(Document document) {
        Map<String, DocumentField> fields = document.getFields();

        return new InvoiceData(
                Optional.ofNullable(fields.get("CustomerName"))
                        .map(DocumentField::getValueString),
                Optional.ofNullable(fields.get("BillingAddress"))
                        .map(DocumentField::getValueAddress)
                        .map(Address::fromAzure),
                Optional.ofNullable(fields.get("PurchaseOrder"))
                        .map(DocumentField::getValueString),
                Optional.ofNullable(fields.get("InvoiceId"))
                        .map(DocumentField::getValueString),
                fields.get("InvoiceDate").getValueDate(),
                Optional.ofNullable(fields.get("DueDate"))
                        .map(DocumentField::getValueDate),
                Optional.ofNullable(fields.get("SubTotal"))
                        .map(DocumentField::getValueCurrency)
                        .map(CurrencyValue::getAmount),
                fields.get("InvoiceTotal").getValueCurrency().getAmount(),
                Optional.ofNullable(fields.get("AmountDue"))
                        .map(DocumentField::getValueCurrency)
                        .map(CurrencyValue::getAmount),
                Optional.ofNullable(fields.get("CurrencyCode"))
                        .map(DocumentField::getValueString)
                        .orElse("EUR"));
    }
}
