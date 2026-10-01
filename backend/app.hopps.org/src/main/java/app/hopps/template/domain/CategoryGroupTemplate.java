package app.hopps.template.domain;

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

    public List<TemplateCategoryValue> getValues() {
        return values;
    }

    /**
     * Replaces the values with the given list, in order. Blank entries are skipped, the rest are trimmed and
     * de-duplicated (first occurrence wins). Values that stay keep their row, so a large template is not rewritten on
     * every save.
     */
    public void replaceValues(List<String> newValues) {
        List<String> cleaned = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        if (newValues != null) {
            for (String raw : newValues) {
                if (raw == null || raw.isBlank()) {
                    continue;
                }
                String value = raw.trim();
                if (seen.add(value)) {
                    cleaned.add(value);
                }
            }
        }

        Map<String, TemplateCategoryValue> existing = new HashMap<>();
        for (TemplateCategoryValue v : values) {
            existing.put(v.getValue(), v);
        }
        values.removeIf(v -> !seen.contains(v.getValue()));

        for (int i = 0; i < cleaned.size(); i++) {
            String value = cleaned.get(i);
            TemplateCategoryValue row = existing.get(value);
            if (row == null) {
                values.add(new TemplateCategoryValue(this, value, i));
            } else {
                row.setSortIndex(i);
            }
        }
        // kept rows were updated in place; restore list order so callers see the new order before a reload
        values.sort(Comparator.comparingInt(TemplateCategoryValue::getSortIndex));
    }
}
