package app.hopps.model;

import org.mustangproject.Invoice;
import org.mustangproject.ZUGFeRD.TransactionCalculator;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

public record InvoiceData(
        String customerName,
        Optional<String> billingAddress,
        Optional<String> purchaseOrderNumber,
        Optional<String> invoiceId,
        LocalDate invoiceDate,
        Optional<LocalDate> dueDate,
        double total,
        Optional<Double> amountDue,
        String currencyCode) {

    public static InvoiceData fromZugferd(Invoice invoice) {
        TransactionCalculator tc = new TransactionCalculator(invoice);
        double prePaidAmount;

        if(invoice.getTotalPrepaidAmount() == null) {
            prePaidAmount = 0;
        } else {
            prePaidAmount = invoice.getTotalPrepaidAmount().doubleValue();
        }

        LocalDate dueDate = invoice.getDueDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();

        return new InvoiceData(
                invoice.getRecipient().getName(),
                Optional.ofNullable(invoice.getRecipient().getAdditionalAddress()),
                Optional.ofNullable(invoice.getReferenceNumber()),
                Optional.ofNullable(invoice.getNumber()),
                invoice.getIssueDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDate(),
                Optional.ofNullable(dueDate),
                tc.getChargeTotal().doubleValue(),
                Optional.ofNullable(tc.getChargeTotal().doubleValue() - prePaidAmount),
                invoice.getCurrency()
        );
    }
}
