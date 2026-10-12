package app.hopps.bommel.repository;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.domain.TreeSearchBommel;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.organization.domain.Organization;
import app.hopps.transaction.repository.TransactionRepository;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.InternalServerErrorException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@ApplicationScoped
public class BommelRepository implements PanacheRepository<Bommel> {

    @Inject
    TransactionRepository transactionRepository;

    /**
     * The ids of the given bommels together with all of their descendants (recursively). Used to find every transaction
     * that sits "under" a set of bommels — e.g. those affected when a category group becomes mandatory for them.
     */
    public Set<Long> getSelfAndDescendantIds(Collection<Long> bommelIds) {
        Set<Long> result = new HashSet<>();
        if (bommelIds == null) {
            return result;
        }
        for (Long id : bommelIds) {
            if (id == null) {
                continue;
            }
            result.add(id);
            Bommel base = findById(id);
            if (base != null) {
                for (TreeSearchBommel descendant : getChildrenRecursive(base)) {
                    result.add(descendant.bommel().id);
                }
            }
        }
        return result;
    }

    /**
     * Fetches the lineage of this bommel, so the path all the way to the root bommel. Does not include the base element
     * itself. Goes upwards towards the root element, i.e. the root element will always be the last.
     */
    public List<TreeSearchBommel> getParents(Bommel base) throws WebApplicationException {
        List<TreeSearchBommel> possibleCycleBommels = this.getEntityManager()
                .createNamedQuery("Bommel.GetParentsRecursive", TreeSearchBommel.class)
                .setParameter("startId", base.id)
                .getResultList();

        Optional<TreeSearchBommel> cycle = possibleCycleBommels.stream()
                .filter(TreeSearchBommel::cycleMark)
                .findAny();

        if (cycle.isPresent()) {
            throw new WebApplicationException("Cycle detected on bommel " + cycle.get());
        }

        return possibleCycleBommels;
    }

    public Organization getOrganization(Bommel base) throws WebApplicationException {
        if (base.getOrganization() != null) {
            return base.getOrganization();
        }

        Optional<TreeSearchBommel> root = getParents(base).stream()
                .filter(bommel -> bommel.bommel().getOrganization() != null)
                .findAny();

        if (root.isEmpty()) {
            throw new InternalServerErrorException("Bommel " + base.id + " does not have a root?!");
        }

        return root.get().bommel().getOrganization();
    }

    /**
     * Gets all children, recursively. The cyclePath of the returned record will be the id's from the base Bommel to the
     * found child, including the base id and its own id.
     *
     * @throws IllegalStateException
     *             when there has been a cycle
     */
    public List<TreeSearchBommel> getChildrenRecursive(Bommel base) throws IllegalStateException {
        List<TreeSearchBommel> possibleCycleBommels = this.getEntityManager()
                .createNamedQuery("Bommel.GetChildrenRecursive", TreeSearchBommel.class)
                .setParameter("startId", base.id)
                .getResultList();

        Optional<TreeSearchBommel> cycle = possibleCycleBommels.stream()
                .filter(TreeSearchBommel::cycleMark)
                .findAny();

        if (cycle.isPresent()) {
            throw new WebApplicationException("Cycle detected on bommel " + cycle.get());
        }

        return possibleCycleBommels;
    }

    public Optional<Bommel> getRootBommel(long orgId) {
        return find("where organization.id = :org",
                Map.of("org", orgId))
                        .firstResultOptional();
    }

    /**
     * @param root
     *            This bommel will be used as the root bommel of its organization. The organization cannot be just an
     *            id, it needs to be a managed object.
     */
    @Transactional
    public Bommel createRoot(Bommel root) throws WebApplicationException {
        if (root.getParent() != null) {
            throw new WebApplicationException("Root bommel cannot have a parent", Response.Status.BAD_REQUEST);
        }

        if (root.getOrganization() == null) {
            throw new WebApplicationException("Root bommel needs to have an organization", Response.Status.BAD_REQUEST);
        }

        long rootNodeCount = count("organization", root.getOrganization());

        if (rootNodeCount != 0) {
            throw new WebApplicationException("Expected 0 root nodes in organization, found " + rootNodeCount,
                    Response.Status.CONFLICT);
        }

        persist(root);
        root.getOrganization().setRootBommel(root);

        return root;
    }

    /**
     * Inserts this bommel, linking it to the stored parent. This cannot create a root node, use
     * {@link BommelRepository#createRoot} for that.
     */
    @Transactional
    public Bommel insertBommel(Bommel child) throws WebApplicationException {
        if (child.getParent() == null) {
            throw new WebApplicationException("Bommel must have a parent", Response.Status.BAD_REQUEST);
        }
        if (child.getOrganization() != null) {
            throw new WebApplicationException("non-root Bommel cannot have an organization");
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
                    Response.Status.BAD_REQUEST);
        }

        // The bommel itself plus, when deleting recursively, every bommel below it (removed by the children cascade)
        List<Long> deletedIds = new ArrayList<>();
        deletedIds.add(bommel.id);
        if (recursive) {
            getChildrenRecursive(bommel).forEach(descendant -> deletedIds.add(descendant.bommel().id));
        }

        // Confirming requires a bommel, so whatever was confirmed on the deleted bommels is reopened: confirmed
        // transactions go back to DRAFT (their receipts back to unchecked) and show up as open again, ready for a new
        // bommel. Confirmed receipts booked on them without such a transaction are unchecked again as well.
        transactionRepository.reopen(transactionRepository.findConfirmedIdsByBommelIds(deletedIds));
        getEntityManager()
                .createQuery("UPDATE Document d SET d.documentStatus = :analyzed "
                        + "WHERE d.documentStatus = :confirmed AND d.bommel.id IN :ids")
                .setParameter("analyzed", DocumentStatus.ANALYZED)
                .setParameter("confirmed", DocumentStatus.CONFIRMED)
                .setParameter("ids", deletedIds)
                .executeUpdate();

        // Transactions and receipts are kept, only detached (bommel_id = NULL). Receipts have to be detached as well:
        // their foreign key has no ON DELETE action, so a single receipt would otherwise make the delete fail.
        getEntityManager()
                .createQuery("UPDATE Transaction t SET t.bommel = NULL WHERE t.bommel.id IN :ids")
                .setParameter("ids", deletedIds)
                .executeUpdate();
        getEntityManager()
                .createQuery("UPDATE Document d SET d.bommel = NULL WHERE d.bommel.id IN :ids")
                .setParameter("ids", deletedIds)
                .executeUpdate();

        // A bank account must always hang on a bommel. Accounts normally sit on the root, which cannot be deleted, but
        // the
        // API allows sub-bommels: move those up to the deleted bommel's parent instead of failing.
        if (bommel.getParent() != null) {
            getEntityManager()
                    .createQuery("UPDATE BankAccount a SET a.bommel = :parent WHERE a.bommel.id IN :ids")
                    .setParameter("parent", bommel.getParent())
                    .setParameter("ids", deletedIds)
                    .executeUpdate();
        }

        delete(bommel);
    }

    @Transactional
    public Bommel moveBommel(Bommel bommel, Bommel destination) {
        if (getOrganization(bommel) != getOrganization(destination)) {
            throw new WebApplicationException("Cannot move bommel into another organization",
                    Response.Status.BAD_REQUEST);
        }

        if (bommel.getParent() == null) {
            throw new WebApplicationException("Cannot move the root bommel");
        }

        persist(bommel);
        bommel.setParent(destination);
        ensureNoCycleFromBommel(bommel);

        return bommel;
    }

    /**
     * Counts the number of edges (k) and vertices (n) in all trees, and uses the property n = k - 1 to ensure that no
     * illegal subtrees have separated and no cycles exist. This is expensive, especially with a large number of
     * bommels. We have exactly as many subtrees as we have root nodes with an organization attached (parent = null and
     * organization != null). If there's a root node without an organization, this means that it got created by
     * accident.
     */
    @Transactional
    public void ensureConsistency() throws WebApplicationException {
        var edgesCount = count("where parent is not null");
        var nodesCount = count();
        var roots = find("where organization is not null and parent is null").list();

        if ((nodesCount - roots.size()) != edgesCount) {
            throw new WebApplicationException(
                    "An illegal subtree has been created"
                            + " (nodes=" + nodesCount + ", roots=" + roots.size()
                            + ", edges=" + edgesCount + ")");
        }

        long reachableNodes = roots.size();
        for (Bommel treeRoot : roots) {
            reachableNodes += getChildrenRecursive(treeRoot).size();
        }

        if (reachableNodes != nodesCount) {
            throw new WebApplicationException("Could only reach "
                    + reachableNodes + "/" + nodesCount + " nodes, starting from root");
        }
    }

    /**
     * Ensures that, starting from child, there is no cycle in the graph. Uses getParents internally.
     */
    private void ensureNoCycleFromBommel(Bommel child) throws WebApplicationException {
        getParents(child);
    }
}
