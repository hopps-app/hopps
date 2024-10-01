package app.hopps.model;

import com.azure.ai.documentintelligence.models.Document;
import com.azure.ai.documentintelligence.models.DocumentField;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

public record InvoiceData(
    String customerName,
    Address billingAddress,
    String purchaseOrderNumber,
    String invoiceId,
    LocalDate invoiceDate,
    LocalDate dueDate,
    double subTotal,
    double total,
    double amountDue,
    String currencyCode
) {
    public static InvoiceData fromDocument(Document document) {
        Map<String, DocumentField> fields = document.getFields();

        return new InvoiceData(
            fields.get("CustomerName").getValueString(),
            Address.fromAzure(fields.get("BillingAddress").getValueAddress()),
            fields.get("PurchaseOrder").getValueString(),
            fields.get("InvoiceId").getValueString(),
            fields.get("InvoiceDate").getValueDate(),
            fields.get("DueDate").getValueDate(),
            fields.get("SubTotal").getValueCurrency().getAmount(),
            fields.get("InvoiceTotal").getValueCurrency().getAmount(),
            fields.get("AmountDue").getValueCurrency().getAmount(),
            fields.get("CurrencyCode").getValueString()
        );
    }
}
