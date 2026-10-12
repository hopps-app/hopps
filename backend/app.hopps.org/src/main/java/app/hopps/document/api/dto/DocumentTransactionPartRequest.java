package app.hopps.document.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.Map;

/**
 * One part of a document's split: the transaction booked for one bommel/category combination. The amount is the
 * unsigned share of the document total; its sign follows the document direction (INCOMING = expense, OUTGOING =
 * income). Everything else (date, counterparty, currency, privately-paid flag) is inherited from the document.
 *
 * @param id
 *            the existing transaction to update in place, or null to create a new part
 * @param name
 *            the transaction name; when blank, the document name (single part) or "Teil n" (several parts) is used
 * @param amount
 *            the unsigned share of the document total; must be greater than zero
 * @param bommelId
 *            the bommel the part is booked against; may be null while the split is a draft
 * @param categoryValues
 *            category-group values as groupId → value; groups not applicable to the bommel are discarded
 */
@Schema(name = "DocumentTransactionPartRequest", description = "One part of a document split")
public record DocumentTransactionPartRequest(
        Long id,
        String name,
        BigDecimal amount,
        Long bommelId,
        Map<Long, String> categoryValues) {
}
