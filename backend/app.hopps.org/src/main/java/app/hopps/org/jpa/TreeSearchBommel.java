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
                // For some reason, either hibernate or postgres
                // return a list of strings here `{"1","2"}`
                // instead of a list of long's `{1,2}`.
                .map(id -> id.replace("\"", ""))
                .map(Long::valueOf)
                .toList();
    }
}
