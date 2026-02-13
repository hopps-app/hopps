package app.hopps.transaction.domain;

import app.hopps.bommel.domain.Bommel;
import app.hopps.category.domain.Category;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.TradeParty;
import app.hopps.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

/**
 * Represents a financial transaction in the system. Transactions store the business data entered by users, while
 * Documents store analysis results. A Transaction may or may not be linked to a Document (manual entry vs. document
 * upload).
 */
@Entity
@Table(name = "transaction")
public class Transaction extends PanacheEntity {

    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bommel_id")
    private Bommel bommel;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id")
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Enumerated(EnumType.STRING)
    private TransactionArea area;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'DRAFT'")
    private TransactionStatus status = TransactionStatus.DRAFT;

    @Column(name = "created_by", nullable = false, updatable = false)
    private String createdBy;

    private String name;

    private BigDecimal total;

    @Column(name = "totaltax")
    private BigDecimal totalTax;

    @Column(name = "currencycode")
    private String currencyCode;

    @Column(name = "transaction_time")
    private Instant transactionTime;

    @Column(name = "duedate")
    private Instant dueDate;

    @Column(name = "privately_paid")
    @ColumnDefault("false")
    private boolean privatelyPaid;

    @ManyToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private TradeParty sender;

    @ManyToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id")
    private TradeParty recipient;

    @ElementCollection
    @CollectionTable(name = "transaction_tags", joinColumns = @JoinColumn(name = "transaction_id"))
    @Column(name = "tags")
    private Set<String> tags = new HashSet<>();

    // Invoice-specific fields
    @Column(name = "ordernumber")
    private String orderNumber;

    @Column(name = "invoiceid")
    private String invoiceId;

    @Column(name = "amountdue")
    private BigDecimal amountDue;

    // Legacy field - will be removed after data migration
    @Column(name = "document_key")
    private String documentKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public Transaction() {
        this.createdAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public Organization getOrganization() {
        return organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public Bommel getBommel() {
        return bommel;
    }

    public void setBommel(Bommel bommel) {
        this.bommel = bommel;
    }

    public Document getDocument() {
        return document;
    }

    public void setDocument(Document document) {
        this.document = document;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public TransactionArea getArea() {
        return area;
    }

    public void setArea(TransactionArea area) {
        this.area = area;
    }

    public TransactionStatus getStatus() {
        return status;
    }

    public void setStatus(TransactionStatus status) {
        this.status = status;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public BigDecimal getTotalTax() {
        return totalTax;
    }

    public void setTotalTax(BigDecimal totalTax) {
        this.totalTax = totalTax;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
    }

    public Instant getTransactionTime() {
        return transactionTime;
    }

    public void setTransactionTime(Instant transactionTime) {
        this.transactionTime = transactionTime;
    }

    public Instant getDueDate() {
        return dueDate;
    }

    public void setDueDate(Instant dueDate) {
        this.dueDate = dueDate;
    }

    public boolean isPrivatelyPaid() {
        return privatelyPaid;
    }

    public void setPrivatelyPaid(boolean privatelyPaid) {
        this.privatelyPaid = privatelyPaid;
    }

    public TradeParty getSender() {
        return sender;
    }

    public void setSender(TradeParty sender) {
        this.sender = sender;
    }

    public TradeParty getRecipient() {
        return recipient;
    }

    public void setRecipient(TradeParty recipient) {
        this.recipient = recipient;
    }

    public Set<String> getTags() {
        return tags;
    }

    public void setTags(Set<String> tags) {
        this.tags = tags;
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

    public BigDecimal getAmountDue() {
        return amountDue;
    }

    public void setAmountDue(BigDecimal amountDue) {
        this.amountDue = amountDue;
    }

    @Deprecated
    public String getDocumentKey() {
        return documentKey;
    }

    @Deprecated
    public void setDocumentKey(String documentKey) {
        this.documentKey = documentKey;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    // Helper methods

    public String getSenderName() {
        return sender != null ? sender.getName() : null;
    }

    public String getSenderStreet() {
        return sender != null ? sender.getStreet() : null;
    }

    public String getSenderZipCode() {
        return sender != null ? sender.getZipCode() : null;
    }

    public String getSenderCity() {
        return sender != null ? sender.getCity() : null;
    }

    public boolean hasDocument() {
        return document != null;
    }

    public boolean isDraft() {
        return status == TransactionStatus.DRAFT;
    }

    public boolean isConfirmed() {
        return status == TransactionStatus.CONFIRMED;
    }
}
