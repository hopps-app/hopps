package app.hopps.bankimport.parser;

import java.util.List;

/**
 * Heuristic CSV delimiter detection: counts occurrences of common candidates ({@code ;}, {@code ,}, {@code \t},
 * {@code |}) across a sample of lines and picks the one with the most consistent per-line count. Used for the import
 * preview step to suggest a default to the user (see bank-import-feature.md §4.1).
 */
public final class DelimiterDetector {

    private static final char[] CANDIDATES = { ';', ',', '\t', '|' };

    private DelimiterDetector() {
    }

    /** Detects the most likely delimiter from a sample of lines. Defaults to {@code ;} if no clear winner. */
    public static char detect(List<String> sampleLines) {
        if (sampleLines == null || sampleLines.isEmpty()) {
            return ';';
        }
        char best = ';';
        double bestScore = -1;
        for (char candidate : CANDIDATES) {
            double score = scoreCandidate(candidate, sampleLines);
            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        }
        return best;
    }

    /**
     * Score = average per-line occurrences if at least one line has 2+ occurrences AND the count is fairly consistent
     * (low variance). Lines with 0 occurrences disqualify a candidate (return -1).
     */
    private static double scoreCandidate(char candidate, List<String> sampleLines) {
        int totalCount = 0;
        int linesWithMatches = 0;
        int firstLineCount = -1;
        int linesMatchingFirst = 0;
        for (String line : sampleLines) {
            int c = countChar(line, candidate);
            totalCount += c;
            if (c > 0) {
                linesWithMatches++;
            }
            if (firstLineCount < 0 && c > 0) {
                firstLineCount = c;
            }
            if (firstLineCount > 0 && c == firstLineCount) {
                linesMatchingFirst++;
            }
        }
        if (linesWithMatches < Math.max(1, sampleLines.size() / 2)) {
            return -1;
        }
        double avg = (double) totalCount / sampleLines.size();
        double consistency = (double) linesMatchingFirst / sampleLines.size();
        return avg * consistency;
    }

    private static int countChar(String s, char c) {
        if (s == null) {
            return 0;
        }
        int n = 0;
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) == c) {
                n++;
            }
        }
        return n;
    }
}
