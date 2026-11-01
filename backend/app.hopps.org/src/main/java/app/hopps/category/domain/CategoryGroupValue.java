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
 * <p>
 * A value can sit under a parent value of the same group; the hierarchy has two levels at most. Uniqueness spans both
 * levels because transactions store the value as text, so a parent can always be derived from it.
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @JsonIgnore
    private CategoryGroupValue parent;

    /** Whether transactions can carry this value. False for a parent that only collects its children. */
    private boolean bookable = true;

    /** Taken out of the pickers for new bookings; existing bookings keep the value. */
    private boolean hidden;

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

    public CategoryGroupValue getParent() {
        return parent;
    }

    public void setParent(CategoryGroupValue parent) {
        this.parent = parent;
    }

    public boolean isBookable() {
        return bookable;
    }

    public void setBookable(boolean bookable) {
        this.bookable = bookable;
    }

    public boolean isHidden() {
        return hidden;
    }

    public void setHidden(boolean hidden) {
        this.hidden = hidden;
    }

    /** Hidden by its parent: hiding a parent hides its children with it. */
    public boolean isParentHidden() {
        return parent != null && parent.isHidden();
    }

    /** Whether a new booking can use this value. */
    public boolean isSelectable() {
        return bookable && !hidden && !isParentHidden();
    }
}
