package app.hopps.bommel.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Sets or clears the opening balance of a bommel. Both fields are given together; both null removes it.
 */
@Schema(name = "BommelOpeningBalanceInput", description = "Opening balance of a bommel on a reference date. Both null removes it.")
public record BommelOpeningBalanceInput(
        @Schema(description = "Balance on the reference date, may be negative") BigDecimal openingBalance,
        @Schema(description = "Reference date (yyyy-MM-dd); transactions after it are added to the balance") LocalDate openingBalanceDate) {
}
