package app.hopps.commons;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

public record InvoiceData(
        Long referenceKey,
        BigDecimal total,
        LocalDate invoiceDate,
        String currencyCode,
        Optional<String> customerName,
        Optional<Address> billingAddress,
        Optional<String> purchaseOrderNumber,
        Optional<String> invoiceId,
        Optional<LocalDate> dueDate,
        Optional<BigDecimal> subTotal,
        Optional<BigDecimal> amountDue) implements Data {

    public InvoiceData(Long referenceKey, BigDecimal total, LocalDate invoiceDate, String currencyCode) {
        this(referenceKey, total, invoiceDate, currencyCode, Optional.empty(), Optional.empty(), Optional.empty(),
                Optional.empty(),
                Optional.empty(), Optional.empty(), Optional.empty());
    }
}
