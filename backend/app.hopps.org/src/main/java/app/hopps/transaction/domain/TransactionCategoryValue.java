package app.hopps.transaction.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;

/**
 * The value a transaction carries for one category group — a historical snapshot. The group is referenced softly by id
 * (a plain column with an {@code ON DELETE SET NULL} FK, not a JPA association) and the value is stored as text, so
 * deleting a group or one of its values never removes the record from an already-booked transaction.
 */
@Entity
@Table(name = "transaction_category_value", uniqueConstraints = @UniqueConstraint(name = "uk_txn_category_value", columnNames = {
        "transaction_id", "category_group_id" }))
public class TransactionCategoryValue extends PanacheEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id")
    @JsonIgnore
    private Transaction transaction;

    /** Soft reference to the category group; becomes null when the group is deleted (history is kept). */
    @Column(name = "category_group_id")
    private Long categoryGroupId;

    @NotBlank
    @Column(columnDefinition = "text")
    private String value;

    public TransactionCategoryValue() {
        // no args constructor
    }

    public TransactionCategoryValue(Transaction transaction, Long categoryGroupId, String value) {
        this.transaction = transaction;
        this.categoryGroupId = categoryGroupId;
        this.value = value;
    }

    public Long getId() {
        return id;
    }

    public Transaction getTransaction() {
        return transaction;
    }

    public void setTransaction(Transaction transaction) {
        this.transaction = transaction;
    }

    public Long getCategoryGroupId() {
        return categoryGroupId;
    }

    public void setCategoryGroupId(Long categoryGroupId) {
        this.categoryGroupId = categoryGroupId;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
