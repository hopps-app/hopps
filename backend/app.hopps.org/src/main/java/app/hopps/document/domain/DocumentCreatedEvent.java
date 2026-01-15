package app.hopps.document.domain;

/**
 * Event fired when a new document is created and persisted. Used to trigger async document analysis after the
 * transaction commits.
 *
 * @param documentId
 *            the ID of the created document
 */
public record DocumentCreatedEvent(Long documentId) {
}
