package app.hopps.uploadlink.api.dto;

/**
 * Confirms one submitted receipt. Deliberately carries no document data: the submitter has no access to it.
 */
public record PublicUploadResponse(String fileName) {
}
