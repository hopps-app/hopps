package app.hopps.document.service;

import app.hopps.document.domain.TradeParty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Lifecycle operations for {@link TradeParty}.
 * <p>
 * A trade party can be shared: confirming a document hands its sender to the newly created transaction, so both rows
 * end up pointing at the same party. The associations therefore must not cascade REMOVE — deleting one owner would try
 * to take the party with it and break the other owner's foreign key. Ownership is managed here instead, by the delete
 * paths handing over each side once their row is gone.
 */
@ApplicationScoped
public class TradePartyService {
    private static final Logger LOG = LoggerFactory.getLogger(TradePartyService.class);

    @Inject
    EntityManager entityManager;

    /**
     * Deletes the given trade party if no document and no transaction reference it any more. Null-safe, and a no-op
     * while other rows still point at the party.
     * <p>
     * Call this <em>after</em> the owning document or transaction has been deleted, otherwise that owner still counts
     * as a reference and the party is kept.
     *
     * @param party
     *            the party to drop if it has become unreferenced; may be null
     */
    public void deleteIfUnreferenced(TradeParty party) {
        if (party == null || party.id == null) {
            return;
        }

        // Make the pending owner delete visible to the count queries below.
        entityManager.flush();

        if (countReferences(party) > 0) {
            return;
        }

        entityManager.remove(party);
        LOG.debug("Deleted unreferenced trade party: id={}, name={}", party.id, party.getName());
    }

    private long countReferences(TradeParty party) {
        return count("Document", party) + count("Transaction", party);
    }

    private long count(String entityName, TradeParty party) {
        return entityManager
                .createQuery("SELECT COUNT(e) FROM " + entityName
                        + " e WHERE e.sender = :party OR e.recipient = :party", Long.class)
                .setParameter("party", party)
                .getSingleResult();
    }
}
