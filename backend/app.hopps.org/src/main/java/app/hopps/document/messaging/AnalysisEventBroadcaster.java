package app.hopps.document.messaging;

import jakarta.enterprise.context.ApplicationScoped;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * Broadcaster for Server-Sent Events (SSE) to notify clients about analysis progress.
 * Manages subscriptions per transaction record ID and broadcasts events to all subscribers.
 */
@ApplicationScoped
public class AnalysisEventBroadcaster {
    private static final Logger LOG = LoggerFactory.getLogger(AnalysisEventBroadcaster.class);

    /**
     * Map of transaction record ID to list of event consumers (SSE connections).
     */
    private final Map<Long, CopyOnWriteArrayList<Consumer<AnalysisEvent>>> subscribers = new ConcurrentHashMap<>();

    /**
     * Subscribe to analysis events for a specific transaction record.
     *
     * @param transactionRecordId the transaction record ID
     * @param consumer            the event consumer (SSE emitter)
     */
    public void subscribe(Long transactionRecordId, Consumer<AnalysisEvent> consumer) {
        LOG.info("New SSE subscriber for transaction record: {}", transactionRecordId);
        subscribers.computeIfAbsent(transactionRecordId, k -> new CopyOnWriteArrayList<>()).add(consumer);
    }

    /**
     * Unsubscribe from analysis events.
     *
     * @param transactionRecordId the transaction record ID
     * @param consumer            the event consumer to remove
     */
    public void unsubscribe(Long transactionRecordId, Consumer<AnalysisEvent> consumer) {
        LOG.info("SSE subscriber disconnected for transaction record: {}", transactionRecordId);
        CopyOnWriteArrayList<Consumer<AnalysisEvent>> subs = subscribers.get(transactionRecordId);
        if (subs != null) {
            subs.remove(consumer);
            if (subs.isEmpty()) {
                subscribers.remove(transactionRecordId);
            }
        }
    }

    /**
     * Broadcast an event to all subscribers of a transaction record.
     *
     * @param transactionRecordId the transaction record ID
     * @param eventType           the event type
     * @param data                the event data
     */
    public void broadcast(Long transactionRecordId, String eventType, Map<String, Object> data) {
        LOG.debug("Broadcasting event '{}' for transaction record {}: {}", eventType, transactionRecordId, data);
        CopyOnWriteArrayList<Consumer<AnalysisEvent>> subs = subscribers.get(transactionRecordId);
        if (subs != null && !subs.isEmpty()) {
            AnalysisEvent event = new AnalysisEvent(eventType, data);
            subs.forEach(consumer -> {
                try {
                    consumer.accept(event);
                } catch (Exception e) {
                    LOG.error("Error broadcasting event to subscriber", e);
                }
            });
        }
    }

    /**
     * Check if there are any subscribers for a transaction record.
     *
     * @param transactionRecordId the transaction record ID
     * @return true if there are subscribers
     */
    public boolean hasSubscribers(Long transactionRecordId) {
        CopyOnWriteArrayList<Consumer<AnalysisEvent>> subs = subscribers.get(transactionRecordId);
        return subs != null && !subs.isEmpty();
    }

    /**
     * An analysis event to be sent via SSE.
     */
    public record AnalysisEvent(String type, Map<String, Object> data) {
    }
}
