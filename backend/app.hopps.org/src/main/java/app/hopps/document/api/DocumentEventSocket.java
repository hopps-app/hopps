package app.hopps.document.api;

import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * WebSocket endpoint the frontend connects to in order to receive live document-change notifications. The endpoint
 * itself only keeps the connection open; messages are pushed by {@code DocumentChangeBroadcaster}. The payload carries
 * the changed document ID (and organization ID) — the frontend always reloads the full list via the authenticated REST
 * API in response.
 */
@WebSocket(path = "/ws/documents")
public class DocumentEventSocket {

    private static final Logger LOG = LoggerFactory.getLogger(DocumentEventSocket.class);

    @OnOpen
    public void onOpen(WebSocketConnection connection) {
        LOG.debug("Document WebSocket opened: {}", connection.id());
    }

    @OnClose
    public void onClose(WebSocketConnection connection) {
        LOG.debug("Document WebSocket closed: {}", connection.id());
    }
}
