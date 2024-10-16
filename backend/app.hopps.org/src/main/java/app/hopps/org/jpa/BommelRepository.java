package app.hopps.org.jpa;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@ApplicationScoped
public class BommelRepository implements PanacheRepository<Bommel> {

    private static Logger LOGGER = LoggerFactory.getLogger(BommelRepository.class);

    /**
     * Fetches the lineage of this bommel,
     * so the path all the way to the root bommel.
     * TODO: make this a recursive query
     */
    public List<Bommel> getParents(Bommel base) throws IllegalStateException {
        List<Bommel> parents = new ArrayList<>();

        Bommel current = base;
        int i;
        for (i = 0; i < 200 && current != null; i++) {
            current = current.getParent();
            parents.add(current);
        }

        if (i >= 100) {
            LOGGER.error("Bommel has more than 200 parents, loop in tree? (bommel={})", base);
            throw new IllegalStateException("Bommel has more than 200 parents, loop in tree?");
        }

        return parents;
    }

    /**
     * Inserts this bommel, linking it to the stored parent (if available).
     */
    public void insertBommel(Bommel child) {
        if (!child.isPersistent()) {
            child.persist();
        }

        ensureTreeConsistency();
    }

    /**
     * Counts the number of edges (k) and vertices (n) in the tree,
     * and uses the property n = k - 1 to ensure that no subtrees
     * have separated and no cycles exist.
     * This is expensive, especially with a large number of bommels.
     */
    public void ensureTreeConsistency() throws IllegalStateException {
        var edgesCount = count("where parent != null");
        var nodesCount = count();
        if (nodesCount != (edgesCount + 1)) {
            throw new IllegalStateException("Operation introduced loop/created a separate tree");
        }
    }

}
