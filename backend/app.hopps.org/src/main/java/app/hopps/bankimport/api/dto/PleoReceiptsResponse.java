package app.hopps.bankimport.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/**
 * Outcome of attaching receipt files to Pleo expenses.
 */
@Schema(name = "PleoReceiptsResponse", description = "Outcome of attaching receipt files to Pleo expenses")
public record PleoReceiptsResponse(
        @Schema(description = "Receipts created and linked to a booking") List<LinkedReceipt> linked,
        @Schema(description = "Files not used, with the reason") List<SkippedFile> skipped) {

    @Schema(name = "PleoLinkedReceipt", description = "A receipt created from one or more files and linked to a booking")
    public record LinkedReceipt(
            @Schema(description = "The expense's receipt number") String receiptNumber,
            @Schema(description = "The files the receipt was made of") List<String> fileNames,
            @Schema(description = "The booking it is linked to") Long transactionId,
            @Schema(description = "The new receipt") Long documentId) {
    }

    @Schema(name = "PleoSkippedFile", description = "A file that was not used")
    public record SkippedFile(
            @Schema(description = "The file's name") String fileName,
            @Schema(description = "NO_EXPENSE (no expense with this receipt number), HAS_RECEIPT (the booking has a receipt already), NOT_DRAFT (the booking is confirmed), DUPLICATE (the organization has this file already), UNSUPPORTED_TYPE, TOO_LARGE or UNREADABLE") String reason) {
    }
}
