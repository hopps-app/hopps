package app.hopps.bankimport.domain;

import app.hopps.transaction.domain.Transaction;
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

/**
 * N:M link between {@link BankTransaction} and {@link Transaction} (bookkeeping). Reserved for Phase 2
 * (reconciliation). The schema is created in MVP so no migration is needed when reconciliation lands.
 */
@Entity
@Table(name = "BankTransactionMatch")
public class BankTransactionMatch extends PanacheEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "banktransaction_id", nullable = false)
    private BankTransaction bankTransaction;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false)
    private Transaction transaction;

    @Column(name = "matchedamount", nullable = false, precision = 38, scale = 2)
    private BigDecimal matchedAmount;

    /**
     * Whether {@link #matchedAmount} was set explicitly by the user (a partial allocation, e.g. when one collective
     * bank transfer is split across several bookkeeping transactions). Manual allocations are preserved: unlike the
     * default full-amount snapshot they are not overwritten when the transaction total later changes (see
     * {@code BankTransactionMatchService#updateMatchedAmountForTransaction}).
     */
    @Column(name = "amountmanual", nullable = false)
    private boolean amountManual = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "matchtype", nullable = false)
    private BankTransactionMatchType matchType = BankTransactionMatchType.MANUAL;

    @Column(name = "matchedby", nullable = false, updatable = false)
    private String matchedBy;

    @Column(name = "matchedat", nullable = false, updatable = false)
    private Instant matchedAt;

    @Column(columnDefinition = "text")
    private String notes;

    public BankTransactionMatch() {
        this.matchedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public BankTransaction getBankTransaction() {
        return bankTransaction;
    }

    public void setBankTransaction(BankTransaction bankTransaction) {
        this.bankTransaction = bankTransaction;
    }

    public Transaction getTransaction() {
        return transaction;
    }

    public void setTransaction(Transaction transaction) {
        this.transaction = transaction;
    }

    public BigDecimal getMatchedAmount() {
        return matchedAmount;
    }

    public void setMatchedAmount(BigDecimal matchedAmount) {
        this.matchedAmount = matchedAmount;
    }

    public boolean isAmountManual() {
        return amountManual;
    }

    public void setAmountManual(boolean amountManual) {
        this.amountManual = amountManual;
    }

    public BankTransactionMatchType getMatchType() {
        return matchType;
    }

    public void setMatchType(BankTransactionMatchType matchType) {
        this.matchType = matchType;
    }

    public String getMatchedBy() {
        return matchedBy;
    }

    public void setMatchedBy(String matchedBy) {
        this.matchedBy = matchedBy;
    }

    public Instant getMatchedAt() {
        return matchedAt;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
