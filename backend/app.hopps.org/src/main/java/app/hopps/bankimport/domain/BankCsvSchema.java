package app.hopps.bankimport.domain;

import app.hopps.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Defines how a bank's CSV export is parsed: delimiter, encoding, date/decimal formats, amount strategy and the mapping
 * of CSV columns to canonical {@link BankFieldType} fields. Reusable across multiple {@link BankAccount}s of the same
 * organization.
 */
@Entity
@Table(name = "BankCsvSchema")
public class BankCsvSchema extends PanacheEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false)
    private String name;

    @Column(name = "bankidentifier")
    private String bankIdentifier;

    @Column(nullable = false)
    private char delimiter = ';';

    @Column(name = "quotechar", nullable = false)
    private char quoteChar = '"';

    @Column(nullable = false)
    private String encoding = "UTF-8";

    @Column(name = "skiplines", nullable = false)
    private int skipLines = 0;

    @Column(name = "hasheader", nullable = false)
    private boolean hasHeader = true;

    @Column(name = "dateformat", nullable = false)
    private String dateFormat = "dd.MM.yyyy";

    @Column(name = "decimalseparator", nullable = false)
    private char decimalSeparator = ',';

    @Column(name = "thousandseparator")
    private Character thousandSeparator;

    @Enumerated(EnumType.STRING)
    @Column(name = "amountstrategy", nullable = false)
    private AmountStrategy amountStrategy = AmountStrategy.SIGNED_SINGLE_COLUMN;

    /**
     * Comma-separated list of values that indicate a positive (incoming) amount. Only used with
     * AMOUNT_PLUS_TYPE_COLUMN.
     */
    @Column(name = "amounttypepositivevalues", columnDefinition = "text")
    private String amountTypePositiveValues;

    @OneToMany(mappedBy = "schema", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BankCsvColumnMapping> columnMappings = new ArrayList<>();

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

    public BankCsvSchema() {
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getBankIdentifier() {
        return bankIdentifier;
    }

    public void setBankIdentifier(String bankIdentifier) {
        this.bankIdentifier = bankIdentifier;
    }

    public char getDelimiter() {
        return delimiter;
    }

    public void setDelimiter(char delimiter) {
        this.delimiter = delimiter;
    }

    public char getQuoteChar() {
        return quoteChar;
    }

    public void setQuoteChar(char quoteChar) {
        this.quoteChar = quoteChar;
    }

    public String getEncoding() {
        return encoding;
    }

    public void setEncoding(String encoding) {
        this.encoding = encoding;
    }

    public int getSkipLines() {
        return skipLines;
    }

    public void setSkipLines(int skipLines) {
        this.skipLines = skipLines;
    }

    public boolean isHasHeader() {
        return hasHeader;
    }

    public void setHasHeader(boolean hasHeader) {
        this.hasHeader = hasHeader;
    }

    public String getDateFormat() {
        return dateFormat;
    }

    public void setDateFormat(String dateFormat) {
        this.dateFormat = dateFormat;
    }

    public char getDecimalSeparator() {
        return decimalSeparator;
    }

    public void setDecimalSeparator(char decimalSeparator) {
        this.decimalSeparator = decimalSeparator;
    }

    public Character getThousandSeparator() {
        return thousandSeparator;
    }

    public void setThousandSeparator(Character thousandSeparator) {
        this.thousandSeparator = thousandSeparator;
    }

    public AmountStrategy getAmountStrategy() {
        return amountStrategy;
    }

    public void setAmountStrategy(AmountStrategy amountStrategy) {
        this.amountStrategy = amountStrategy;
    }

    public String getAmountTypePositiveValues() {
        return amountTypePositiveValues;
    }

    public void setAmountTypePositiveValues(String amountTypePositiveValues) {
        this.amountTypePositiveValues = amountTypePositiveValues;
    }

    public List<BankCsvColumnMapping> getColumnMappings() {
        return columnMappings;
    }

    public void setColumnMappings(List<BankCsvColumnMapping> columnMappings) {
        this.columnMappings = columnMappings;
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
