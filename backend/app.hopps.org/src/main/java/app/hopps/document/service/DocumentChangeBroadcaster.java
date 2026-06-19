package app.hopps.document.service;

import app.hopps.document.domain.DocumentChangedEvent;
import io.quarkus.websockets.next.OpenConnections;
import io.quarkus.websockets.next.WebSocketConnection;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.event.TransactionPhase;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Pushes document-change notifications to all connected WebSocket clients. Observes {@link DocumentChangedEvent} after
 * the producing transaction has committed, so clients that reload always see the persisted state.
 */
@ApplicationScoped
public class DocumentChangeBroadcaster {

    private static final Logger LOG = LoggerFactory.getLogger(DocumentChangeBroadcaster.class);

    @Inject
    OpenConnections connections;

    public void onDocumentChanged(@Observes(during = TransactionPhase.AFTER_SUCCESS) DocumentChangedEvent event) {
        broadcast(event.documentId(), event.organizationId());
    }

    void broadcast(Long documentId, Long organizationId) {
        if (documentId == null) {
            return;
        }
        String message = String.format("{\"documentId\":%d,\"organizationId\":%s}",
                documentId, organizationId != null ? organizationId.toString() : "null");
        for (WebSocketConnection connection : connections) {
            try {
                connection.sendTextAndAwait(message);
            } catch (Exception e) {
                LOG.debug("Failed to push document-change notification to connection {}: {}", connection.id(),
                        e.getMessage());
            }
        }
    }
}
