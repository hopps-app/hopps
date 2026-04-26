package app.hopps.bankimport.domain;

import app.hopps.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * A single bank transaction parsed from a CSV import. Negative amount = outgoing, positive = incoming. Belongs to
 * exactly one {@link BankAccount} and was created by exactly one {@link BankImport}.
 */
@Entity
@Table(name = "BankTransaction")
public class BankTransaction extends PanacheEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "bankaccount_id", nullable = false)
    private BankAccount bankAccount;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "import_id", nullable = false)
    private BankImport bankImport;

    @Column(name = "bookingdate", nullable = false)
    private LocalDate bookingDate;

    @Column(name = "valuedate")
    private LocalDate valueDate;

    @Column(nullable = false, precision = 38, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "EUR";

    @Column(columnDefinition = "text")
    private String purpose;

    @Column(name = "counterpartyname", length = 512)
    private String counterpartyName;

    @Column(name = "counterpartyiban", length = 34)
    private String counterpartyIban;

    @Column(name = "counterpartybic", length = 11)
    private String counterpartyBic;

    @Column(name = "transactiontype")
    private String transactionType;

    @Column(name = "bankreference")
    private String bankReference;

    @Column(name = "endtoendreference")
    private String endToEndReference;

    @Column(name = "mandatereference")
    private String mandateReference;

    @Column(name = "creditorid")
    private String creditorId;

    @Column(name = "balanceafter", precision = 38, scale = 2)
    private BigDecimal balanceAfter;

    @Column(name = "rawrow", columnDefinition = "text")
    private String rawRow;

    @Column(name = "dedupehash", nullable = false, length = 64)
    private String dedupeHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BankTransactionStatus status = BankTransactionStatus.UNMATCHED;

    @Column(name = "matchedamount", nullable = false, precision = 38, scale = 2)
    private BigDecimal matchedAmount = BigDecimal.ZERO;

    @Column(name = "createdat", nullable = false, updatable = false)
    private Instant createdAt;

    public BankTransaction() {
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Organization getOrganization() {
        return organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public BankAccount getBankAccount() {
        return bankAccount;
    }

    public void setBankAccount(BankAccount bankAccount) {
        this.bankAccount = bankAccount;
    }

    public BankImport getBankImport() {
        return bankImport;
    }

    public void setBankImport(BankImport bankImport) {
        this.bankImport = bankImport;
    }

    public LocalDate getBookingDate() {
        return bookingDate;
    }

    public void setBookingDate(LocalDate bookingDate) {
        this.bookingDate = bookingDate;
    }

    public LocalDate getValueDate() {
        return valueDate;
    }

    public void setValueDate(LocalDate valueDate) {
        this.valueDate = valueDate;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public String getCounterpartyName() {
        return counterpartyName;
    }

    public void setCounterpartyName(String counterpartyName) {
        this.counterpartyName = counterpartyName;
    }

    public String getCounterpartyIban() {
        return counterpartyIban;
    }

    public void setCounterpartyIban(String counterpartyIban) {
        this.counterpartyIban = counterpartyIban;
    }

    public String getCounterpartyBic() {
        return counterpartyBic;
    }

    public void setCounterpartyBic(String counterpartyBic) {
        this.counterpartyBic = counterpartyBic;
    }

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }

    public String getBankReference() {
        return bankReference;
    }

    public void setBankReference(String bankReference) {
        this.bankReference = bankReference;
    }

    public String getEndToEndReference() {
        return endToEndReference;
    }

    public void setEndToEndReference(String endToEndReference) {
        this.endToEndReference = endToEndReference;
    }

    public String getMandateReference() {
        return mandateReference;
    }

    public void setMandateReference(String mandateReference) {
        this.mandateReference = mandateReference;
    }

    public String getCreditorId() {
        return creditorId;
    }

    public void setCreditorId(String creditorId) {
        this.creditorId = creditorId;
    }

    public BigDecimal getBalanceAfter() {
        return balanceAfter;
    }

    public void setBalanceAfter(BigDecimal balanceAfter) {
        this.balanceAfter = balanceAfter;
    }

    public String getRawRow() {
        return rawRow;
    }

    public void setRawRow(String rawRow) {
        this.rawRow = rawRow;
    }

    public String getDedupeHash() {
        return dedupeHash;
    }

    public void setDedupeHash(String dedupeHash) {
        this.dedupeHash = dedupeHash;
    }

    public BankTransactionStatus getStatus() {
        return status;
    }

    public void setStatus(BankTransactionStatus status) {
        this.status = status;
    }

    public BigDecimal getMatchedAmount() {
        return matchedAmount;
    }

    public void setMatchedAmount(BigDecimal matchedAmount) {
        this.matchedAmount = matchedAmount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
