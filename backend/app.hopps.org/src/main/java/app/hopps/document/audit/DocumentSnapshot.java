package app.hopps.document.audit;

import app.hopps.document.domain.Document;
import app.hopps.document.domain.DocumentTag;
import app.hopps.transaction.audit.TransactionSnapshot;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;

/**
 * The audited state of a document (Beleg) as plain JSON values (strings, booleans, numbers, lists and maps only), so
 * two snapshots can be compared with {@code equals} and stored as they are. Amounts use the same format as
 * transactions.
 * <p>
 * The analysis bookkeeping (analysis status, extraction source) is left out: it changes on its own and would bury the
 * changes a user made. The analysis has its own entries instead.
 */
public final class DocumentSnapshot {

    private DocumentSnapshot() {
    }

    public static Map<String, Object> of(Document document) {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("name", document.getName());
        state.put("documentStatus", document.getDocumentStatus() == null ? null : document.getDocumentStatus().name());
        state.put("direction", document.getDirection() == null ? null : document.getDirection().name());
        state.put("total", TransactionSnapshot.amount(document.getTotal()));
        state.put("totalTax", TransactionSnapshot.amount(document.getTotalTax()));
        state.put("currencyCode", document.getCurrencyCode());
        state.put("transactionTime",
                document.getTransactionTime() == null ? null : document.getTransactionTime().toString());
        state.put("legalDocumentId", document.getLegalDocumentId());
        state.put("senderName", document.getSender() == null ? null : document.getSender().getName());
        state.put("recipientName", document.getRecipient() == null ? null : document.getRecipient().getName());
        state.put("bommelId", document.getBommel() == null ? null : document.getBommel().id);
        state.put("privatelyPaid", document.isPrivatelyPaid());
        state.put("tags", tags(document));
        state.put("fileName", document.getFileName());
        state.put("fileSize", document.getFileSize());
        state.put("fileHash", document.getFileHash());
        state.put("transactionId", document.getTransaction() == null ? null : document.getTransaction().getId());
        return state;
    }

    /** Tag names, sorted, so the order they were added in does not count as a change. */
    private static List<String> tags(Document document) {
        if (document.getDocumentTags() == null) {
            return List.of();
        }
        return new ArrayList<>(new TreeSet<>(document.getDocumentTags()
                .stream()
                .map(DocumentTag::getName)
                .filter(Objects::nonNull)
                .toList()));
    }
}
