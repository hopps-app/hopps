package app.hopps.fin.jpa.entities;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@SequenceGenerator(allocationSize = 1, name = "transaction_sequence")
public class TransactionRecord {
    @Id
    @GeneratedValue(generator = "transaction_sequence")
    private Long id;

    @Column(name = "bommel_id")
    private Long bommelId;

    // That's the only required common column in the kafka events
    @Column(nullable = false)
    private BigDecimal total;

    // Common optional columns
    @Column(name = "sub_total")
    private BigDecimal subTotal;

    // invoice = invoice date
    // receipt = transaction time
    @Column(name = "transaction_time")
    private Instant transactionTime;

    @Embedded
    private Address address;

    private String name;

    // Specific columns for invoice
    private String orderNumber;
    private String invoiceId;
    private Instant dueDate;
    private BigDecimal amountDue;
    private String currencyCode;

    public TransactionRecord() {
    }

    public TransactionRecord(BigDecimal total) {
        this.total = total;
    }

    public Long getId() {
        return id;
    }

    public Long getBommelId() {
        return bommelId;
    }

    public void setBommelId(Long bommelId) {
        this.bommelId = bommelId;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public BigDecimal getSubTotal() {
        return subTotal;
    }

    public void setSubTotal(BigDecimal subTotal) {
        this.subTotal = subTotal;
    }

    public Instant getTransactionTime() {
        return transactionTime;
    }

    public void setTransactionTime(Instant transactionTime) {
        this.transactionTime = transactionTime;
    }

    public Address getAddress() {
        return address;
    }

    public void setAddress(Address address) {
        this.address = address;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public String getInvoiceId() {
        return invoiceId;
    }

    public void setInvoiceId(String invoiceId) {
        this.invoiceId = invoiceId;
    }

    public Instant getDueDate() {
        return dueDate;
    }

    public void setDueDate(Instant dueDate) {
        this.dueDate = dueDate;
    }

    public BigDecimal getAmountDue() {
        return amountDue;
    }

    public void setAmountDue(BigDecimal amountDue) {
        this.amountDue = amountDue;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
    }
}
