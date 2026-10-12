package app.hopps.document.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * The full set of transactions a document is split into. Applied as an upsert: parts with an id are updated in place,
 * parts without an id are created, and transactions of the document that are not listed are deleted. Confirmed
 * transactions can neither be changed nor removed this way.
 *
 * @param parts
 *            the parts in display order; at least one
 * @param confirmDocument
 *            false keeps the document in review (parts are saved as a draft, sums are not enforced); true marks the
 *            document as confirmed and requires the parts to be complete: each has a bommel and all mandatory category
 *            groups, and their amounts do not exceed the document total
 */
@Schema(name = "DocumentTransactionsUpdateRequest", description = "Upsert of the transactions a document is split into")
public record DocumentTransactionsUpdateRequest(
        List<DocumentTransactionPartRequest> parts,
        boolean confirmDocument) {
}
