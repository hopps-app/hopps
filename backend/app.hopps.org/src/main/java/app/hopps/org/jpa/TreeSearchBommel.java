package app.hopps.org.jpa;

import java.util.Arrays;
import java.util.List;

public record TreeSearchBommel(
        Bommel bommel,
        boolean cycleMark,
        List<Long> cyclePath) {
    public TreeSearchBommel(Bommel bommel, Boolean cycleMark, String cyclePath) {
        this(bommel, cycleMark != null && cycleMark, parseCyclePath(cyclePath));
    }

    private static List<Long> parseCyclePath(String cyclePath) {
        var childIds = cyclePath
                .substring(1, cyclePath.length() - 1)
                .split(",");

        return Arrays.stream(childIds)
                .map(Long::valueOf)
                .toList();
    }
}
