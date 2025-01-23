package app.hopps.fin.jpa.entities;

import app.hopps.commons.DocumentType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.SequenceGenerator;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Generated;

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

    @Column(name = "document_key", nullable = false)
    private String documentKey;

    @Column(nullable = false, updatable = false)
    private String uploader;

    // That's the only required common column in the kafka events
    @Column(nullable = false)
    private BigDecimal total;

    @Generated
    @Column(name = "privately_paid")
    @ColumnDefault("false")
    private boolean privatelyPaid;

    @Column(nullable = false)
    private DocumentType document;

    // invoice = invoice date
    // receipt = transaction time
    @Column(name = "transaction_time")
    private Instant transactionTime;

    @OneToOne
    private TradeParty sender;

    @OneToOne
    private TradeParty recipient;

    private String name;

    // Specific columns for invoice
    private String orderNumber;
    private String invoiceId;
    private Instant dueDate;
    private BigDecimal amountDue;
    private String currencyCode;

    protected TransactionRecord() {
    }

    public TransactionRecord(BigDecimal total, DocumentType document, String uploader) {
        this.total = total;
        this.document = document;
        this.uploader = uploader;
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

    public String getDocumentKey() {
        return documentKey;
    }

    public void setDocumentKey(String documentKey) {
        this.documentKey = documentKey;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public Instant getTransactionTime() {
        return transactionTime;
    }

    public void setTransactionTime(Instant transactionTime) {
        this.transactionTime = transactionTime;
    }

    public TradeParty getSender() {
        return sender;
    }

    public void setSender(TradeParty address) {
        this.sender = address;
    }

    public TradeParty getRecipient() {return recipient;}

    public void setRecipient(TradeParty address) {
        this.recipient = address;
    }

    public boolean isPrivatelyPaid() {
        return privatelyPaid;
    }

    public void setPrivatelyPaid(boolean privatelyPaid) {
        this.privatelyPaid = privatelyPaid;
    }

    public DocumentType getDocument() {
        return document;
    }

    public void setDocument(DocumentType document) {
        this.document = document;
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
