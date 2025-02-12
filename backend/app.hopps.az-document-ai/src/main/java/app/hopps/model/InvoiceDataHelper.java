package app.hopps.model;

import app.hopps.commons.InvoiceData;
import com.azure.ai.documentintelligence.models.AnalyzedDocument;
import com.azure.ai.documentintelligence.models.DocumentField;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

public class InvoiceDataHelper {
    private InvoiceDataHelper() {
        // only call the static method
    }

    public static InvoiceData fromDocument(AnalyzedDocument document) {
        Map<String, DocumentField> fields = document.getFields();

        return new InvoiceData(
                -1L,
                BigDecimal.valueOf(fields.get("InvoiceTotal").getValueCurrency().getAmount()),
                fields.get("InvoiceDate").getValueDate(),
                Optional.ofNullable(fields.get("CurrencyCode"))
                        .map(DocumentField::getValueString)
                        .orElse("EUR"),
                Optional.ofNullable(fields.get("CustomerName"))
                        .map(DocumentField::getValueString),
                Optional.ofNullable(fields.get("PurchaseOrder"))
                        .map(DocumentField::getValueString),
                Optional.ofNullable(fields.get("InvoiceId"))
                        .map(DocumentField::getValueString),
                Optional.ofNullable(fields.get("DueDate"))
                        .map(DocumentField::getValueDate),
                Optional.ofNullable(fields.get("AmountDue"))
                        .map(DocumentField::getValueCurrency)
                        .map(t -> BigDecimal.valueOf(t.getAmount())),
                Optional.ofNullable(fields.get("BillingAddress"))
                        .map(DocumentField::getValueAddress)
                        .map(TradePartyHelper::fromAzure),
                null);
    }
}
