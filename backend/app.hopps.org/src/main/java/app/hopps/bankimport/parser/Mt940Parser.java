package app.hopps.bankimport.parser;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Parses raw SWIFT MT940 bank statement files into structured {@link ParsedMt940Transaction} records.
 * <p>
 * A MT940 file contains one or more message blocks separated by a {@code -} on its own line. Each block contains fields
 * tagged {@code :NN:}. Multi-line field values are supported: a continuation line does not start with {@code :NN:}.
 * <p>
 * Supported tags:
 * <ul>
 * <li>{@code :20:} — transaction reference (ignored)</li>
 * <li>{@code :25:} — account identification (ignored)</li>
 * <li>{@code :28C:} — statement sequence (ignored)</li>
 * <li>{@code :60F:}/{@code :60M:} — opening balance (provides currency)</li>
 * <li>{@code :61:} — transaction line</li>
 * <li>{@code :86:} — transaction details / subfields</li>
 * <li>{@code :62F:}/{@code :62M:} — closing balance</li>
 * </ul>
 */
public final class Mt940Parser {

    /** First tag of every well-formed MT940 message block. */
    private static final Pattern FIELD_TAG = Pattern.compile("^:(\\d{2}[A-Z]?):");

    private Mt940Parser() {
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Heuristic detection: returns {@code true} when the first 512 bytes of {@code content} look like a MT940 file.
     */
    public static boolean isMt940(byte[] content) {
        int limit = Math.min(content.length, 512);
        String head = new String(content, 0, limit, java.nio.charset.StandardCharsets.ISO_8859_1);
        return head.contains(":20:") || head.contains(":25:") || head.contains(":60F:") || head.contains(":60M:");
    }

    /**
     * Parses a full MT940 text (already decoded from bytes) into a flat list of transactions. Multiple message blocks
     * (separated by {@code -}) are all parsed and their transactions combined.
     */
    public static List<ParsedMt940Transaction> parse(String text) {
        List<ParsedMt940Transaction> result = new ArrayList<>();
        for (String block : splitBlocks(text)) {
            result.addAll(parseBlock(block));
        }
        return result;
    }

    // -------------------------------------------------------------------------
    // Record
    // -------------------------------------------------------------------------

    public record ParsedMt940Transaction(
            LocalDate valueDate,
            LocalDate bookingDate,
            BigDecimal amount,
            String currency,
            String transactionType,
            String purpose,
            String counterpartyName,
            String counterpartyIban,
            String counterpartyBic,
            String endToEndReference,
            String mandateReference,
            String creditorId,
            BigDecimal balanceAfter,
            String rawLine) {
    }

    // -------------------------------------------------------------------------
    // Block splitting
    // -------------------------------------------------------------------------

    private static List<String> splitBlocks(String text) {
        List<String> blocks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String line : text.split("\r?\n", -1)) {
            if ("-".equals(line.trim())) {
                String block = current.toString().trim();
                if (!block.isEmpty()) {
                    blocks.add(block);
                }
                current.setLength(0);
            } else {
                current.append(line).append('\n');
            }
        }
        String last = current.toString().trim();
        if (!last.isEmpty()) {
            blocks.add(last);
        }
        return blocks;
    }

    // -------------------------------------------------------------------------
    // Per-block parsing
    // -------------------------------------------------------------------------

    private static List<ParsedMt940Transaction> parseBlock(String block) {
        // Reassemble logical fields (tag + possibly multi-line value).
        List<TaggedField> fields = collectFields(block);

        String currency = null;
        BigDecimal closingBalance = null;

        // Extract currency from :60F:/:60M: and closing balance from :62F:/:62M:
        for (TaggedField f : fields) {
            if (f.tag.equals("60F") || f.tag.equals("60M")) {
                currency = parseCurrencyFromBalance(f.value);
            } else if (f.tag.equals("62F") || f.tag.equals("62M")) {
                closingBalance = parseAmountFromBalance(f.value);
            }
        }

        List<ParsedMt940Transaction> txs = new ArrayList<>();
        TaggedField pending61 = null;
        for (TaggedField f : fields) {
            if (f.tag.equals("61")) {
                pending61 = f;
            } else if (f.tag.equals("86") && pending61 != null) {
                ParsedMt940Transaction tx = buildTransaction(pending61, f, currency, closingBalance);
                if (tx != null) {
                    txs.add(tx);
                }
                pending61 = null;
            }
        }
        // :61: without :86: (rare but valid)
        if (pending61 != null) {
            ParsedMt940Transaction tx = buildTransaction(pending61, null, currency, closingBalance);
            if (tx != null) {
                txs.add(tx);
            }
        }
        return txs;
    }

    // -------------------------------------------------------------------------
    // Field collection
    // -------------------------------------------------------------------------

    private static List<TaggedField> collectFields(String block) {
        List<TaggedField> fields = new ArrayList<>();
        String currentTag = null;
        StringBuilder currentValue = new StringBuilder();
        String rawLine61 = null;

        for (String line : block.split("\n", -1)) {
            java.util.regex.Matcher m = FIELD_TAG.matcher(line);
            if (m.find()) {
                if (currentTag != null) {
                    fields.add(new TaggedField(currentTag, currentValue.toString().trim(), rawLine61));
                }
                currentTag = m.group(1);
                currentValue.setLength(0);
                currentValue.append(line.substring(m.end()));
                rawLine61 = currentTag.equals("61") ? line : null;
            } else if (currentTag != null) {
                // Continuation line
                currentValue.append('\n').append(line);
            }
        }
        if (currentTag != null) {
            fields.add(new TaggedField(currentTag, currentValue.toString().trim(), rawLine61));
        }
        return fields;
    }

    private record TaggedField(String tag, String value, String rawLine) {
    }

    // -------------------------------------------------------------------------
    // :61: parsing
    // -------------------------------------------------------------------------

    /**
     * Parses a :61: field value.
     *
     * <pre>
     * YYMMDD[MMDD]<CD>[3rdCcy]<amount>N<code><ref>
     * </pre>
     */
    private static Tx61 parse61(String value) {
        if (value == null || value.length() < 10) {
            return null;
        }
        int pos = 0;

        // Value date: YYMMDD
        if (value.length() < pos + 6) {
            return null;
        }
        LocalDate valueDate = parseDate6(value.substring(pos, pos + 6));
        pos += 6;

        // Optional entry date: MMDD
        LocalDate bookingDate = valueDate;
        if (value.length() > pos + 1 && Character.isDigit(value.charAt(pos))
                && Character.isDigit(value.charAt(pos + 1))) {
            // Could be entry date MMDD or start of CD indicator (C/D)
            // Distinguish: entry date is 4 digits, CD indicator is 1-2 letters
            if (value.length() > pos + 3
                    && Character.isDigit(value.charAt(pos + 2))
                    && Character.isDigit(value.charAt(pos + 3))
                    && (value.length() <= pos + 4 || !Character.isDigit(value.charAt(pos + 4)))) {
                int month = Integer.parseInt(value.substring(pos, pos + 2));
                int day = Integer.parseInt(value.substring(pos + 2, pos + 4));
                bookingDate = valueDate.withMonth(month).withDayOfMonth(day);
                pos += 4;
            }
        }

        // CD indicator: C, D, CR, DR, RC, RD
        if (pos >= value.length()) {
            return null;
        }
        boolean credit;
        if (value.startsWith("CR", pos) || value.startsWith("RC", pos)) {
            credit = true;
            pos += 2;
        } else if (value.startsWith("DR", pos) || value.startsWith("RD", pos)) {
            credit = false;
            pos += 2;
        } else if (value.charAt(pos) == 'C') {
            credit = true;
            pos++;
        } else if (value.charAt(pos) == 'D') {
            credit = false;
            pos++;
        } else {
            return null;
        }

        // Optional 3rd currency letter (single alpha not followed by amount digit: skip)
        if (pos < value.length() && Character.isLetter(value.charAt(pos))) {
            // peek: if next char after is digit, this is the 3rd currency code; skip it
            pos++;
        }

        // Amount (comma decimal separator, no thousand separator)
        int amountEnd = pos;
        while (amountEnd < value.length() && (Character.isDigit(value.charAt(amountEnd))
                || value.charAt(amountEnd) == ',')) {
            amountEnd++;
        }
        if (amountEnd == pos) {
            return null;
        }
        String amountStr = value.substring(pos, amountEnd).replace(',', '.');
        BigDecimal amount;
        try {
            amount = new BigDecimal(amountStr);
        } catch (NumberFormatException e) {
            return null;
        }
        if (!credit) {
            amount = amount.negate();
        }
        pos = amountEnd;

        // Fund code N (skip)
        if (pos < value.length() && value.charAt(pos) == 'N') {
            pos++;
        }

        // 3-char transaction code (skip)
        if (pos + 3 <= value.length()) {
            pos += 3;
        }

        // Rest is reference (up to // or end)
        String ref = value.substring(pos);
        int slashIdx = ref.indexOf("//");
        if (slashIdx >= 0) {
            ref = ref.substring(0, slashIdx);
        }
        ref = ref.trim();
        if (ref.isEmpty()) {
            ref = null;
        }

        return new Tx61(valueDate, bookingDate, amount, ref);
    }

    private record Tx61(LocalDate valueDate, LocalDate bookingDate, BigDecimal amount, String reference) {
    }

    // -------------------------------------------------------------------------
    // :86: subfield parsing
    // -------------------------------------------------------------------------

    private static Tx86 parse86(String value) {
        if (value == null || value.isBlank()) {
            return new Tx86(null, null, null, null, null, null, null, null);
        }
        // Replace newlines in value — multi-line :86: is common
        value = value.replace('\n', ' ').replace('\r', ' ');

        String transactionType = null;
        String bic = null;
        String iban = null;
        String name1 = null;
        String name2 = null;

        // Split by ?NN subfields
        // Each subfield starts with ?<2-digit-code>
        java.util.regex.Pattern subfieldPattern = java.util.regex.Pattern.compile("\\?(\\d{2})");
        java.util.regex.Matcher m = subfieldPattern.matcher(value);

        List<int[]> positions = new ArrayList<>();
        while (m.find()) {
            positions.add(new int[] { Integer.parseInt(m.group(1)), m.start(), m.end() });
        }

        // Text before first subfield
        String preamble = positions.isEmpty() ? value : value.substring(0, positions.get(0)[1]);

        StringBuilder purposeParts = new StringBuilder();

        for (int i = 0; i < positions.size(); i++) {
            int[] pos = positions.get(i);
            int code = pos[0];
            int valueEnd = (i + 1 < positions.size()) ? positions.get(i + 1)[1] : value.length();
            String rawFieldVal = value.substring(pos[2], valueEnd);
            String fieldVal = rawFieldVal.trim();

            if (code == 0) {
                transactionType = fieldVal;
            } else if (code >= 20 && code <= 29) {
                // Verwendungszweck (?20–?29): the bank splits one logical purpose across these continuation subfields
                // at fixed-width boundaries, so a boundary can fall exactly on a space. Append the RAW content (not
                // trimmed) so a space sitting at the split is preserved (e.g. "…29.05.2026 " + "siehe Anlage").
                // Trimming
                // each part here would glue the words into "29.05.2026siehe Anlage". The whole blob is trimmed once
                // below.
                purposeParts.append(rawFieldVal);
            } else if (code == 30) {
                bic = fieldVal.isEmpty() ? null : fieldVal;
            } else if (code == 31) {
                iban = fieldVal.isEmpty() ? null : fieldVal;
            } else if (code == 32) {
                name1 = fieldVal.isEmpty() ? null : fieldVal;
            } else if (code == 33) {
                name2 = fieldVal.isEmpty() ? null : fieldVal;
            }
            // codes 10, 34+ are ignored
        }

        // Parse the purpose blob through Mt940PurposeParser
        String rawBlob = purposeParts.toString().trim();
        if (rawBlob.isEmpty() && !preamble.trim().isEmpty()) {
            rawBlob = preamble.trim();
        }

        String purpose = null;
        String eref = null;
        String mref = null;
        String cred = null;

        if (!rawBlob.isEmpty()) {
            Mt940PurposeParser.ParsedPurpose parsed = Mt940PurposeParser.parse(rawBlob);
            purpose = parsed.purpose();
            eref = parsed.endToEndReference();
            mref = parsed.mandateReference();
            cred = parsed.creditorId();
        }

        // Combine name parts
        String name = null;
        if (name1 != null && name2 != null) {
            name = (name1 + name2).trim();
        } else if (name1 != null) {
            name = name1;
        } else if (name2 != null) {
            name = name2;
        }

        return new Tx86(transactionType, purpose, eref, mref, cred, name, iban, bic);
    }

    private record Tx86(
            String transactionType,
            String purpose,
            String endToEndReference,
            String mandateReference,
            String creditorId,
            String counterpartyName,
            String counterpartyIban,
            String counterpartyBic) {
    }

    // -------------------------------------------------------------------------
    // Transaction builder
    // -------------------------------------------------------------------------

    private static ParsedMt940Transaction buildTransaction(
            TaggedField f61,
            TaggedField f86,
            String currency,
            BigDecimal closingBalance) {
        Tx61 t61 = parse61(f61.value());
        if (t61 == null) {
            return null;
        }
        Tx86 t86 = parse86(f86 != null ? f86.value() : null);

        return new ParsedMt940Transaction(
                t61.valueDate(),
                t61.bookingDate(),
                t61.amount(),
                currency,
                t86.transactionType(),
                t86.purpose(),
                t86.counterpartyName(),
                t86.counterpartyIban(),
                t86.counterpartyBic(),
                t86.endToEndReference(),
                t86.mandateReference(),
                t86.creditorId(),
                closingBalance,
                f61.rawLine());
    }

    // -------------------------------------------------------------------------
    // Balance helpers
    // -------------------------------------------------------------------------

    private static String parseCurrencyFromBalance(String value) {
        // Format: C/D<6n-date><3a-currency><amount>
        if (value == null || value.length() < 11) {
            return null;
        }
        // Skip C/D indicator + 6-digit date = 7 chars
        int start = 7;
        if (start + 3 > value.length()) {
            return null;
        }
        return value.substring(start, start + 3);
    }

    private static BigDecimal parseAmountFromBalance(String value) {
        if (value == null || value.length() < 12) {
            return null;
        }
        boolean credit = value.charAt(0) == 'C';
        // Skip indicator + date + currency = 1 + 6 + 3 = 10
        String amountStr = value.substring(10).replace(',', '.');
        try {
            BigDecimal amount = new BigDecimal(amountStr);
            return credit ? amount : amount.negate();
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // Date helpers
    // -------------------------------------------------------------------------

    private static LocalDate parseDate6(String yymmdd) {
        int yy = Integer.parseInt(yymmdd.substring(0, 2));
        int mm = Integer.parseInt(yymmdd.substring(2, 4));
        int dd = Integer.parseInt(yymmdd.substring(4, 6));
        int year = 2000 + yy; // MT940 uses 2-digit years; assume 21st century
        return LocalDate.of(year, mm, dd);
    }
}
