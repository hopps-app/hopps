package app.hopps.template.domain;

import app.hopps.category.api.dto.CategoryValueEntry;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** One value of a {@link CategoryGroupTemplate}. Unique per template, ordered by {@code sortIndex}. */
@Entity
@Table(name = "template_category_value", uniqueConstraints = @UniqueConstraint(name = "uk_template_category_value", columnNames = {
        "template_id", "value" }))
public class TemplateCategoryValue extends PanacheEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private CategoryGroupTemplate template;

    @Column(nullable = false, columnDefinition = "text")
    private String value;

    @Column(name = "sort_index", nullable = false)
    private int sortIndex;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private TemplateCategoryValue parent;

    @Column(nullable = false)
    private boolean bookable = true;

    @Column(nullable = false)
    private boolean hidden;

    public TemplateCategoryValue() {
        // no args constructor
    }

    public TemplateCategoryValue(CategoryGroupTemplate template, String value, int sortIndex) {
        this.template = template;
        this.value = value;
        this.sortIndex = sortIndex;
    }

    public CategoryGroupTemplate getTemplate() {
        return template;
    }

    public String getValue() {
        return value;
    }

    public int getSortIndex() {
        return sortIndex;
    }

    public void setSortIndex(int sortIndex) {
        this.sortIndex = sortIndex;
    }

    public TemplateCategoryValue getParent() {
        return parent;
    }

    public void setParent(TemplateCategoryValue parent) {
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

    /** This value as a flat list entry, as the dialog and the export file use it. */
    public CategoryValueEntry toEntry() {
        return new CategoryValueEntry(value, parent == null ? null : parent.getValue(), bookable, hidden);
    }
}
