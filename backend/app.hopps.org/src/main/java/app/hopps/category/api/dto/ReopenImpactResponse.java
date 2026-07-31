package app.hopps.category.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@Schema(name = "ReopenImpactResponse", description = "Confirmed transactions that would be reset to draft")
public record ReopenImpactResponse(long affectedCount, List<Long> transactionIds) {
}
