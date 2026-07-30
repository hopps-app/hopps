package app.hopps.document.api.dto;

/**
 * Body of the 409 response returned when an uploaded file is rejected as a duplicate: it carries the id of the
 * already-existing document so the client can link straight to it.
 *
 * @param existingDocumentId
 *            id of the document that already holds this file content in the organization
 * @param message
 *            human-readable reason
 */
public record DuplicateDocumentResponse(Long existingDocumentId, String message) {
}
