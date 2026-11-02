package app.hopps.template.domain;

import app.hopps.category.api.dto.CategoryValueEntry;
import app.hopps.category.service.CategoryValueTree;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * A template for a category group: the group's settings plus its values. Applying it creates a regular
 * {@code CategoryGroup} in the organization with a copy of every value.
 */
@Entity
@Table(name = "template_category_group")
@PrimaryKeyJoinColumn(name = "template_id")
@DiscriminatorValue("CATEGORY_GROUP")
public class CategoryGroupTemplate extends Template {

    @Column(nullable = false)
    private boolean required;

    /** Stable id of this template, carried by its export file. See {@code CategoryGroup#getSourceKey()}. */
    @Column(name = "source_key", nullable = false)
    private String sourceKey = UUID.randomUUID().toString();

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortIndex")
    private List<TemplateCategoryValue> values = new ArrayList<>();

    @Override
    public TemplateType getType() {
        return TemplateType.CATEGORY_GROUP;
    }

    public boolean isRequired() {
        return required;
    }

    public void setRequired(boolean required) {
        this.required = required;
    }

    public String getSourceKey() {
        return sourceKey;
    }

    public void setSourceKey(String sourceKey) {
        this.sourceKey = sourceKey;
    }

    public List<TemplateCategoryValue> getValues() {
        return values;
    }

    /** Replaces the values with plain top-level categories. See {@link #replaceEntries(List)}. */
    public void replaceValues(List<String> newValues) {
        replaceEntries(newValues == null ? null : newValues.stream().map(CategoryValueEntry::of).toList());
    }

    /**
     * Replaces the values with the given entries, in tree order (see {@link CategoryValueTree#normalize(List)}). Values
     * that stay keep their row, so a large template is not rewritten on every save.
     */
    public void replaceEntries(List<CategoryValueEntry> entries) {
        List<CategoryValueEntry> cleaned = CategoryValueTree.normalize(entries);
        Set<String> kept = new HashSet<>();
        for (CategoryValueEntry entry : cleaned) {
            kept.add(entry.value());
        }

        Map<String, TemplateCategoryValue> rows = new HashMap<>();
        for (TemplateCategoryValue v : values) {
            rows.put(v.getValue(), v);
        }
        values.removeIf(v -> !kept.contains(v.getValue()));

        for (int i = 0; i < cleaned.size(); i++) {
            CategoryValueEntry entry = cleaned.get(i);
            TemplateCategoryValue row = rows.get(entry.value());
            if (row == null) {
                row = new TemplateCategoryValue(this, entry.value(), i);
                rows.put(entry.value(), row);
                values.add(row);
            } else {
                row.setSortIndex(i);
            }
            row.setParent(entry.parent() == null ? null : rows.get(entry.parent()));
            row.setBookable(entry.bookable());
            row.setHidden(entry.hidden());
        }
        // kept rows were updated in place; restore list order so callers see the new order before a reload
        values.sort(Comparator.comparingInt(TemplateCategoryValue::getSortIndex));
    }

    /** All values as flat list entries, in tree order. */
    public List<CategoryValueEntry> toEntries() {
        return values.stream().map(TemplateCategoryValue::toEntry).toList();
    }
}
