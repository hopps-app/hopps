package app.hopps.model;
import org.mustangproject.Invoice;
import org.mustangproject.ZUGFeRD.TransactionCalculator;
import java.util.Date;
import java.util.Optional;

public record InvoiceData(
        Optional<String> customerName,
        Optional<String> billingAddress,
        Optional<String> purchaseOrderNumber,
        Optional<String> invoiceId,
        Date invoiceDate,
        Optional<Date> dueDate,
        double total,
        Optional<Double> amountDue,
        String currencyCode) {


    public static InvoiceData fromZugferd(Invoice invoice) {
        TransactionCalculator tc = new TransactionCalculator(invoice);

        return new InvoiceData(
                Optional.ofNullable(invoice.getRecipient().getName()),
                Optional.ofNullable(invoice.getRecipient().getAdditionalAddress()),
                Optional.ofNullable(invoice.getReferenceNumber()),
                Optional.ofNullable(invoice.getNumber()),
                invoice.getIssueDate(),
                Optional.ofNullable(invoice.getDueDate()),
                tc.getChargeTotal().doubleValue(),
                Optional.ofNullable(tc.getChargeTotal().subtract(invoice.getTotalPrepaidAmount()).doubleValue()),
                invoice.getCurrency()
        );
    }
}
