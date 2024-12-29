package app.hopps.zugferd.model;

import app.hopps.commons.InvoiceData;
import org.mustangproject.Invoice;
import org.mustangproject.ZUGFeRD.TransactionCalculator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

public class InvoiceDataHandler {
    private InvoiceDataHandler() {
        // only call the static method
    }

    public static InvoiceData fromZugferd(Long referenceKey, Invoice invoice) {
        TransactionCalculator tc = new TransactionCalculator(invoice);

        BigDecimal amountDue = tc.getGrandTotal();
        if (invoice.getTotalPrepaidAmount() != null) {
            amountDue = amountDue.subtract(invoice.getTotalPrepaidAmount());
        }

        LocalDate dueDate = invoice.getDueDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();

        return new InvoiceData(
                referenceKey,
                tc.getGrandTotal(),
                invoice.getIssueDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDate(),
                invoice.getCurrency(),
                Optional.ofNullable(invoice.getRecipient().getName()),
                Optional.empty(), // Address
                // invoice.getRecipient().getAdditionalAddress(),
                Optional.ofNullable(invoice.getReferenceNumber()),
                Optional.ofNullable(invoice.getNumber()),
                Optional.ofNullable(dueDate),
                Optional.of(amountDue));
    }
}
