package app.hopps.category.domain;

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
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * A single allowed value within a {@link CategoryGroup}. Values are unique per group and ordered by {@code sortIndex}
 * (creation order by default).
 */
@Entity
@Table(name = "category_group_value", uniqueConstraints = @UniqueConstraint(name = "uk_category_group_value", columnNames = {
        "category_group_id", "value" }))
@Schema(name = "CategoryGroupValue", description = "An allowed value within a category group")
public class CategoryGroupValue extends PanacheEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "category_group_id")
    @JsonIgnore
    private CategoryGroup categoryGroup;

    @NotBlank
    @Column(columnDefinition = "text")
    private String value;

    @Column(name = "sort_index")
    private int sortIndex;

    public CategoryGroupValue() {
        // no args constructor
    }

    public CategoryGroupValue(CategoryGroup categoryGroup, String value, int sortIndex) {
        this.categoryGroup = categoryGroup;
        this.value = value;
        this.sortIndex = sortIndex;
    }

    public Long getId() {
        return id;
    }

    public CategoryGroup getCategoryGroup() {
        return categoryGroup;
    }

    public void setCategoryGroup(CategoryGroup categoryGroup) {
        this.categoryGroup = categoryGroup;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public int getSortIndex() {
        return sortIndex;
    }

    public void setSortIndex(int sortIndex) {
        this.sortIndex = sortIndex;
    }
}
