package app.hopps.org.jpa;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class BommelRepository implements PanacheRepository<Bommel> {

    /**
     * Fetches the lineage of this bommel,
     * so the path all the way to the root bommel.
     * Does not include the base element itself.
     * Goes upwards towards the root element, i.e.
     * the root element will always be the last.
     */
    public List<TreeSearchBommel> getParents(Bommel base) throws WebApplicationException {
        List<TreeSearchBommel> possibleCycleBommels = this.getEntityManager()
                .createNamedQuery("Bommel.GetParentsRecursive", TreeSearchBommel.class)
                .setParameter("startId", base.id)
                .getResultList();

        Optional<TreeSearchBommel> cycle = possibleCycleBommels.stream()
                .filter(TreeSearchBommel::cycleMark).findAny();

        if (cycle.isPresent()) {
            throw new WebApplicationException("Cycle detected on bommel " + cycle.get());
        }

        return possibleCycleBommels;
    }

    /**
     * Gets all children, recursively. The cyclePath of the returned
     * record will be the id's from the base Bommel to the found child,
     * including the base id and its own id.
     * @throws IllegalStateException when there has been a cycle
     */
    public List<TreeSearchBommel> getChildrenRecursive(Bommel base) throws IllegalStateException {
        List<TreeSearchBommel> possibleCycleBommels = this.getEntityManager()
                .createNamedQuery("Bommel.GetChildrenRecursive", TreeSearchBommel.class)
                .setParameter("startId", base.id)
                .getResultList();

        Optional<TreeSearchBommel> cycle = possibleCycleBommels.stream()
                .filter(TreeSearchBommel::cycleMark).findAny();

        if (cycle.isPresent()) {
            throw new WebApplicationException("Cycle detected on bommel " + cycle.get());
        }

        return possibleCycleBommels;
    }

    /**
     * Gets the root object, or null if none exist.
     */
    public Bommel getRoot() {
        return find("where parent is null").firstResult();
    }

    @Transactional
    public Bommel createRoot(Bommel root) throws WebApplicationException  {
        if (root.getParent() != null) {
            throw new WebApplicationException("Root bommel cannot have a parent", Response.Status.BAD_REQUEST);
        }

        long rootNodeCount = count("where parent is null");
        if (rootNodeCount != 0) {
            throw new WebApplicationException("Expected 0 root nodes, found " + rootNodeCount, Response.Status.CONFLICT);
        }

        persist(root);

        return root;
    }

    /**
     * Inserts this bommel, linking it to the stored parent.
     * This cannot create a root node, use {@link BommelRepository#createRoot} for that.
     */
    @Transactional
    public Bommel insertBommel(Bommel child) throws WebApplicationException {
        if (child.getParent() == null) {
            throw new WebApplicationException("Bommel must have a parent", Response.Status.BAD_REQUEST);
        }

        if (!child.isPersistent()) {
            child.persist();
        }

        ensureNoCycleFromBommel(child);

        return child;
    }

    @Transactional
    public void deleteBommel(Bommel bommel, boolean recursive) {
        if (!recursive && !bommel.getChildren().isEmpty()) {
            throw new WebApplicationException(
                    "Bommel has children, specify recursive=true to delete it and its children",
                    Response.Status.BAD_REQUEST
            );
        }

        delete(bommel);
    }

    @Transactional
    public Bommel moveBommel(Bommel bommel, Bommel destination) {
        persist(bommel);
        bommel.setParent(destination);
        ensureNoCycleFromBommel(bommel);

        return bommel;
    }

    /**
     * Counts the number of edges (k) and vertices (n) in the tree,
     * and uses the property n = k - 1 to ensure that no subtrees
     * have separated and no cycles exist.
     * This is expensive, especially with a large number of bommels.
     */
    @Transactional
    public void ensureConsistency() throws WebApplicationException {
        var edgesCount = count("where parent is not null");
        var nodesCount = count();
        if (nodesCount != (edgesCount + 1)) {
            throw new WebApplicationException("Operation introduced loop/created a separate tree");
        }
    }

    /**
     * Ensures that, starting from child, there is no
     * cycle in the graph. Uses getParents internally.
     */
    private void ensureNoCycleFromBommel(Bommel child) throws WebApplicationException {
        getParents(child);
    }
}
