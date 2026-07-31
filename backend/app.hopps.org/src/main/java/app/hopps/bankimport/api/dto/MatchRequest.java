package app.hopps.bankimport.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * Request body for linking a bank transaction to a bookkeeping transaction.
 */
public record MatchRequest(
        @Schema(description = "ID of the bookkeeping transaction to link", required = true) Long transactionId,
        @Schema(description = "Portion of the bank movement used for this transaction (the allocation). "
                + "Omit or null to use the full amount; set an explicit value to split a collective transfer across "
                + "several transactions. Must be positive and at most the bank movement's magnitude.") BigDecimal amount) {
}
