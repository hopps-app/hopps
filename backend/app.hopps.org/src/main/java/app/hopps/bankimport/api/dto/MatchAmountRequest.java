package app.hopps.bankimport.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * Request body for updating the allocation (used amount) of an existing bank-transaction match.
 */
public record MatchAmountRequest(
        @Schema(description = "New portion of the bank movement used for this transaction. Must be positive and at "
                + "most the bank movement's magnitude.", required = true) BigDecimal amount) {
}
