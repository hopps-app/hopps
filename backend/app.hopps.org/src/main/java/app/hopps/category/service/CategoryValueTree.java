package app.hopps.category.service;

import app.hopps.category.api.dto.CategoryValueEntry;
import jakarta.ws.rs.BadRequestException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Validation of flat category lists (dialog, template, export file) against the two-level structure. */
public final class CategoryValueTree {

    private CategoryValueTree() {
    }

    /**
     * Skips blanks, removes duplicates (first occurrence wins) and returns the entries in tree order: every top-level
     * entry directly followed by its children, so a parent is always stored before them.
     *
     * @throws BadRequestException
     *             when an entry names a parent that is not in the list, is its own parent, or the list goes deeper than
     *             two levels
     */
    public static List<CategoryValueEntry> normalize(List<CategoryValueEntry> entries) {
        if (entries == null) {
            return List.of();
        }
        Map<String, CategoryValueEntry> byValue = new LinkedHashMap<>();
        for (CategoryValueEntry entry : entries) {
            if (entry != null && entry.value() != null && !entry.value().isEmpty()) {
                byValue.putIfAbsent(entry.value(), entry);
            }
        }

        Map<String, List<CategoryValueEntry>> children = new LinkedHashMap<>();
        List<CategoryValueEntry> topLevel = new ArrayList<>();
        for (CategoryValueEntry entry : byValue.values()) {
            String parent = entry.parent();
            if (parent == null) {
                topLevel.add(entry);
                continue;
            }
            CategoryValueEntry parentEntry = byValue.get(parent);
            if (parentEntry == null) {
                throw new BadRequestException("Unknown parent category: " + parent);
            }
            if (parent.equals(entry.value())) {
                throw new BadRequestException("A category cannot be its own parent: " + parent);
            }
            if (parentEntry.parent() != null) {
                throw new BadRequestException("Categories can only be nested one level deep: " + entry.value());
            }
            children.computeIfAbsent(parent, k -> new ArrayList<>()).add(entry);
        }

        List<CategoryValueEntry> ordered = new ArrayList<>(byValue.size());
        for (CategoryValueEntry entry : topLevel) {
            ordered.add(entry);
            ordered.addAll(children.getOrDefault(entry.value(), List.of()));
        }
        return ordered;
    }
}
