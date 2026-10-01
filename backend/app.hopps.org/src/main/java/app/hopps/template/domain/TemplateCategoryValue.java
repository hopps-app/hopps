package app.hopps.template.domain;

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
}
