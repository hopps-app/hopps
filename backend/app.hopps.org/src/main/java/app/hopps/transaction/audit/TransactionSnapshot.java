package app.hopps.transaction.audit;

import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionCategoryValue;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * The audited state of a transaction as plain JSON values (strings, booleans, numbers, lists and maps only), so two
 * snapshots can be compared with {@code equals} and stored as they are. Amounts are strings without trailing zeros, so
 * {@code 10.0} and {@code 10.00} are the same value and no precision is lost.
 */
public final class TransactionSnapshot {

    private TransactionSnapshot() {
    }

    public static Map<String, Object> of(Transaction tx) {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("name", tx.getName());
        state.put("status", tx.getStatus() == null ? null : tx.getStatus().name());
        state.put("total", amount(tx.getTotal()));
        state.put("totalTax", amount(tx.getTotalTax()));
        state.put("amountDue", amount(tx.getAmountDue()));
        state.put("currencyCode", tx.getCurrencyCode());
        state.put("transactionTime", tx.getTransactionTime() == null ? null : tx.getTransactionTime().toString());
        state.put("dueDate", tx.getDueDate() == null ? null : tx.getDueDate().toString());
        state.put("privatelyPaid", tx.isPrivatelyPaid());
        state.put("area", tx.getArea() == null ? null : tx.getArea().name());
        state.put("bommelId", tx.getBommel() == null ? null : tx.getBommel().id);
        state.put("senderName", tx.getSender() == null ? null : tx.getSender().getName());
        state.put("recipientName", tx.getRecipient() == null ? null : tx.getRecipient().getName());
        state.put("documentId", tx.getDocument() == null ? null : tx.getDocument().getId());
        state.put("orderNumber", tx.getOrderNumber());
        state.put("invoiceId", tx.getInvoiceId());
        state.put("tags", tx.getTags() == null ? List.of() : new ArrayList<>(new TreeSet<>(tx.getTags())));
        state.put("categoryValues", categoryValues(tx));
        return state;
    }

    /** {@code groupId -> value}, ordered by group id. */
    private static Map<String, Object> categoryValues(Transaction tx) {
        Map<Long, String> byGroup = new TreeMap<>();
        if (tx.getCategoryValues() != null) {
            for (TransactionCategoryValue value : tx.getCategoryValues()) {
                if (value.getCategoryGroupId() != null) {
                    byGroup.put(value.getCategoryGroupId(), value.getValue());
                }
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        byGroup.forEach((groupId, value) -> result.put(String.valueOf(groupId), value));
        return result;
    }

    /** An amount as a plain string without trailing zeros, or null. */
    public static String amount(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.signum() == 0 ? "0" : value.stripTrailingZeros().toPlainString();
    }
}
