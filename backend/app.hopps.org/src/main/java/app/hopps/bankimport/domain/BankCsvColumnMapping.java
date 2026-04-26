package app.hopps.bankimport.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Maps a canonical {@link BankFieldType} to a CSV source column (by index or by name) within a {@link BankCsvSchema}.
 */
@Entity
@Table(name = "BankCsvColumnMapping")
public class BankCsvColumnMapping extends PanacheEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "schema_id", nullable = false)
    private BankCsvSchema schema;

    @Enumerated(EnumType.STRING)
    @Column(name = "targetfield", nullable = false)
    private BankFieldType targetField;

    @Column(name = "sourcecolumnindex")
    private Integer sourceColumnIndex;

    @Column(name = "sourcecolumnname")
    private String sourceColumnName;

    /** Optional transformation expression (e.g. regex capture). Reserved for later. */
    private String transform;

    public Long getId() {
        return id;
    }

    public BankCsvSchema getSchema() {
        return schema;
    }

    public void setSchema(BankCsvSchema schema) {
        this.schema = schema;
    }

    public BankFieldType getTargetField() {
        return targetField;
    }

    public void setTargetField(BankFieldType targetField) {
        this.targetField = targetField;
    }

    public Integer getSourceColumnIndex() {
        return sourceColumnIndex;
    }

    public void setSourceColumnIndex(Integer sourceColumnIndex) {
        this.sourceColumnIndex = sourceColumnIndex;
    }

    public String getSourceColumnName() {
        return sourceColumnName;
    }

    public void setSourceColumnName(String sourceColumnName) {
        this.sourceColumnName = sourceColumnName;
    }

    public String getTransform() {
        return transform;
    }

    public void setTransform(String transform) {
        this.transform = transform;
    }
}
