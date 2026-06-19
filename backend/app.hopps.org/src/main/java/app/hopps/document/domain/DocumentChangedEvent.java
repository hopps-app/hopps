package app.hopps.document.domain;

/**
 * Event fired whenever a document changes in a way the frontend should reflect (created, analysis finished, confirmed,
 * updated, deleted). Observed after the transaction commits and broadcast to connected WebSocket clients so the
 * document list can reload.
 *
 * @param documentId
 *            the ID of the changed document
 * @param organizationId
 *            the ID of the owning organization (so clients can ignore events for other organizations)
 */
public record DocumentChangedEvent(Long documentId, Long organizationId) {
}
