package app.hopps.bankimport.parser;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses the MT940-style "Verwendungszweck" blob into structured fields. Sparkasse legacy exports concatenate the SEPA
 * tags into a single column without delimiters, e.g.
 *
 * <pre>
 * EREF+ABC123MREF+M001CRED+DE12...SVWZ+real purpose textABWA+optional
 * </pre>
 *
 * The known prefixes are {@code EREF+}, {@code MREF+}, {@code CRED+}, {@code SVWZ+}, {@code ABWA+}, {@code KREF+},
 * {@code IBAN+}, {@code BIC+}. We locate every prefix in the input, then slice the string between consecutive prefixes
 * to assign each tag's value. See bank-import-feature.md §2.3 / Q12b.
 */
public final class Mt940PurposeParser {

    private static final Pattern TAG_PATTERN = Pattern.compile(
            "(EREF|MREF|CRED|SVWZ|ABWA|KREF|IBAN|BIC)\\+");

    private Mt940PurposeParser() {
    }

    public record ParsedPurpose(
            String purpose,
            String endToEndReference,
            String mandateReference,
            String creditorId) {
    }

    public static ParsedPurpose parse(String blob) {
        if (blob == null || blob.isBlank()) {
            return new ParsedPurpose(null, null, null, null);
        }

        record TagPosition(String tag, int start, int valueStart) {
        }
        List<TagPosition> positions = new ArrayList<>();
        Matcher matcher = TAG_PATTERN.matcher(blob);
        while (matcher.find()) {
            positions.add(new TagPosition(matcher.group(1), matcher.start(), matcher.end()));
        }

        if (positions.isEmpty()) {
            // No structured tags — entire blob is the plain purpose.
            return new ParsedPurpose(blob.trim(), null, null, null);
        }

        String purpose = null;
        String endToEnd = null;
        String mandate = null;
        String creditor = null;

        // Text before the first tag is also treated as part of the purpose (some exports prefix free text).
        String preamble = blob.substring(0, positions.get(0).start()).trim();

        for (int i = 0; i < positions.size(); i++) {
            TagPosition pos = positions.get(i);
            int valueEnd = (i + 1 < positions.size()) ? positions.get(i + 1).start() : blob.length();
            String value = blob.substring(pos.valueStart(), valueEnd).trim();
            if (value.isEmpty()) {
                continue;
            }
            switch (pos.tag()) {
                case "SVWZ" -> purpose = value;
                case "EREF" -> endToEnd = value;
                case "MREF" -> mandate = value;
                case "CRED" -> creditor = value;
                default -> {
                    // ABWA / KREF / IBAN / BIC are ignored in the MVP — the MT940 export rarely populates them
                    // distinctly from SVWZ for the use-cases we care about.
                }
            }
        }

        // If no SVWZ was found but a preamble exists, use it as the plain-text purpose.
        if (purpose == null && !preamble.isEmpty()) {
            purpose = preamble;
        }
        return new ParsedPurpose(purpose, endToEnd, mandate, creditor);
    }
}
