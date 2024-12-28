package app.hopps.zugferd.model;

import org.mustangproject.Invoice;
import org.mustangproject.ZUGFeRD.TransactionCalculator;

import java.time.LocalDate;
import java.time.ZoneId;

public record InvoiceData(
        String customerName,
        String billingAddress,
        String purchaseOrderNumber,
        String invoiceId,
        LocalDate invoiceDate,
        LocalDate dueDate,
        double total,
        double amountDue,
        String currencyCode) {

    public static InvoiceData fromZugferd(Invoice invoice) {
        TransactionCalculator tc = new TransactionCalculator(invoice);
        double prePaidAmount;

        if (invoice.getTotalPrepaidAmount() == null) {
            prePaidAmount = 0;
        } else {
            prePaidAmount = invoice.getTotalPrepaidAmount().doubleValue();
        }

        LocalDate dueDate = invoice.getDueDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();

        return new InvoiceData(
                invoice.getRecipient().getName(),
                invoice.getRecipient().getAdditionalAddress(),
                invoice.getReferenceNumber(),
                invoice.getNumber(),
                invoice.getIssueDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDate(),
                dueDate,
                tc.getGrandTotal().doubleValue(),
                tc.getChargeTotal().doubleValue() - prePaidAmount,
                invoice.getCurrency()
        );
    }
}
