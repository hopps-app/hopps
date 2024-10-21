package app.hopps.org.jpa;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

@ApplicationScoped
public class BommelRepository implements PanacheRepository<Bommel> {

    private static final Logger LOGGER = LoggerFactory.getLogger(BommelRepository.class);

    /**
     * Fetches the lineage of this bommel,
     * so the path all the way to the root bommel.
     * Does not include the base element itself.
     * Goes upwards towards the root element, i.e.
     * the root element will always be the last.
     */
    public List<TreeSearchBommel> getParents(Bommel base) throws IllegalStateException {
        List<TreeSearchBommel> possibleCycleBommels = this.getEntityManager()
                .createNamedQuery("Bommel.GetParentsRecursive", TreeSearchBommel.class)
                .setParameter("startId", base.id)
                .getResultList();

        Optional<TreeSearchBommel> cycle = possibleCycleBommels.stream()
                .filter(TreeSearchBommel::cycleMark).findAny();

        if (cycle.isPresent()) {
            throw new IllegalStateException("Cycle detected on bommel " + cycle.get());
        }

        return possibleCycleBommels;
    }

    public Bommel getRoot() {
        return find("where parent is null").firstResult();
    }

    @Transactional
    public void createRoot(Bommel root) {
        if (root.getParent() != null) {
            throw new IllegalStateException("Root bommel cannot have a parent");
        }

        long rootNodeCount = count("where parent is null");
        if (rootNodeCount != 0) {
            throw new IllegalStateException("Expected 0 root nodes, found " + rootNodeCount);
        }

        persist(root);
    }

    /**
     * Inserts this bommel, linking it to the stored parent.
     * This cannot create a root node, use {@link BommelRepository#createRoot} for that.
     */
    @Transactional
    public void insertBommel(Bommel child) throws IllegalStateException, IllegalArgumentException {
        if (child.getParent() == null) {
            throw new IllegalArgumentException("Bommel must have a parent");
        }

        if (!child.isPersistent()) {
            child.persist();
        }

        ensureNoCycleFromBommel(child);
    }

    @Transactional
    public void deleteBommel(Bommel bommel, boolean recursive) {
        if (!recursive && !bommel.getChildren().isEmpty()) {
            throw new IllegalArgumentException("Bommel has children, specify recursive=true to delete it and its children");
        }

        delete(bommel);
    }

    @Transactional
    public void moveBommel(Bommel bommel, Bommel destination) {
        persist(bommel);
        bommel.setParent(destination);
        ensureNoCycleFromBommel(bommel);
    }

    /**
     * Counts the number of edges (k) and vertices (n) in the tree,
     * and uses the property n = k - 1 to ensure that no subtrees
     * have separated and no cycles exist.
     * This is expensive, especially with a large number of bommels.
     */
    @Transactional
    public void ensureConsistency() throws IllegalStateException {
        var edgesCount = count("where parent is not null");
        var nodesCount = count();
        if (nodesCount != (edgesCount + 1)) {
            throw new IllegalStateException("Operation introduced loop/created a separate tree");
        }
    }

    /**
     * Ensures that, starting from child, there is no
     * cycle in the graph.
     */
    private void ensureNoCycleFromBommel(Bommel child) throws IllegalStateException {
        Set<Long> parentIdSet = new HashSet<>();

        Bommel current = child;
        while (current != null) {
            if (parentIdSet.contains(current.id)) {
                throw new IllegalStateException("Found cycle containing id " + current.id + " starting with " + child.id);
            }

            parentIdSet.add(current.id);

            current = current.getParent();
        }
    }
}
