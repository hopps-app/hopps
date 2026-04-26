package app.hopps.bankimport.domain;

import app.hopps.bommel.domain.Bommel;
import app.hopps.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * A bank account belonging to an organization. Hangs off a {@link Bommel} (cost-center). Standard case: attached to the
 * org's root bommel; power users can attach accounts to sub-bommels (departments / projects). See
 * bank-import-feature.md §3.1.
 */
@Entity
@Table(name = "BankAccount")
public class BankAccount extends PanacheEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "bommel_id", nullable = false)
    private Bommel bommel;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 34)
    private String iban;

    @Column(length = 11)
    private String bic;

    @Column(name = "bankname")
    private String bankName;

    @Column(name = "accountholder")
    private String accountHolder;

    @Column(nullable = false, length = 3)
    private String currency = "EUR";

    @Column(name = "openingbalance", precision = 38, scale = 2)
    private BigDecimal openingBalance;

    @Column(name = "openingbalancedate")
    private LocalDate openingBalanceDate;

    @Column(columnDefinition = "text")
    private String description;

    private String color;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "defaultschema_id")
    private BankCsvSchema defaultSchema;

    @Column(nullable = false)
    private boolean archived = false;

    @Column(name = "archivedat")
    private Instant archivedAt;

    @Column(name = "createdby", nullable = false, updatable = false)
    private String createdBy;

    @Column(name = "createdat", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updatedat")
    private Instant updatedAt;

    public BankAccount() {
        this.createdAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
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

    public Bommel getBommel() {
        return bommel;
    }

    public void setBommel(Bommel bommel) {
        this.bommel = bommel;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getIban() {
        return iban;
    }

    public void setIban(String iban) {
        this.iban = iban;
    }

    public String getBic() {
        return bic;
    }

    public void setBic(String bic) {
        this.bic = bic;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getAccountHolder() {
        return accountHolder;
    }

    public void setAccountHolder(String accountHolder) {
        this.accountHolder = accountHolder;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public BigDecimal getOpeningBalance() {
        return openingBalance;
    }

    public void setOpeningBalance(BigDecimal openingBalance) {
        this.openingBalance = openingBalance;
    }

    public LocalDate getOpeningBalanceDate() {
        return openingBalanceDate;
    }

    public void setOpeningBalanceDate(LocalDate openingBalanceDate) {
        this.openingBalanceDate = openingBalanceDate;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public BankCsvSchema getDefaultSchema() {
        return defaultSchema;
    }

    public void setDefaultSchema(BankCsvSchema defaultSchema) {
        this.defaultSchema = defaultSchema;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }

    public Instant getArchivedAt() {
        return archivedAt;
    }

    public void setArchivedAt(Instant archivedAt) {
        this.archivedAt = archivedAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
