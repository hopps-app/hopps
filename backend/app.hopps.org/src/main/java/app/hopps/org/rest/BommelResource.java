package app.hopps.org.rest;

import app.hopps.org.jpa.Bommel;
import app.hopps.org.jpa.BommelRepository;
import app.hopps.org.jpa.TreeSearchBommel;
import io.quarkiverse.openfga.client.AuthorizationModelClient;
import io.quarkiverse.openfga.client.model.TupleKey;
import io.quarkus.runtime.configuration.ConfigUtils;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Path("/bommel")
@Authenticated
public class BommelResource {

    @Inject
    BommelRepository bommelRepo;

    @Inject
    SecurityContext securityContext;

    @Inject
    AuthorizationModelClient authModelClient;

    // Auth is only disabled when in dev mode and auth has been disabled through the config property (see below)
    boolean authEnabled;

    public BommelResource(
            @ConfigProperty(name = "quarkus.security.auth.enabled-in-dev-mode", defaultValue = "true") boolean devModeAuthEnabled) {
        this.authEnabled = devModeAuthEnabled || !ConfigUtils.isProfileActive("dev");
    }

    @GET
    @Path("/{id}/children")
    public Set<Bommel> getBommelChildren(@PathParam("id") long id) {
        checkUserHasPermission(id, "read");

        Bommel base = bommelRepo.findById(id);

        if (base == null) {
            throw new WebApplicationException("Invalid id, no such bommel", Response.Status.BAD_REQUEST);
        }

        return base.getChildren();
    }

    @GET
    @Path("/{id}/children/recursive")
    public List<TreeSearchBommel> getBommelChildrenRecursive(@PathParam("id") long id) {
        checkUserHasPermission(id, "read");
        Bommel base = bommelRepo.findById(id);

        if (base == null) {
            throw new WebApplicationException("Invalid id, no such bommel", Response.Status.BAD_REQUEST);
        }

        return bommelRepo.getChildrenRecursive(base);
    }

    @GET
    @Path("/{id}")
    public Optional<Bommel> getBommel(@PathParam("id") long id) {
        checkUserHasPermission(id, "read");

        return bommelRepo.findByIdOptional(id);
    }

    @GET
    @Path("/root")
    public Optional<Bommel> getRootBommel() {
        Bommel rootBommel = bommelRepo.getRoot();

        if (rootBommel == null) {
            return Optional.empty();
        }

        checkUserHasPermission(rootBommel.id, "read");

        return Optional.of(rootBommel);
    }

    @POST
    @Path("/root")
    @Transactional
    public Bommel createRoot(Bommel root) {
        var principal = securityContext.getUserPrincipal();

        if (principal == null && this.authEnabled) {
            throw new WebApplicationException("User is not logged in", Response.Status.INTERNAL_SERVER_ERROR);
        }

        // TODO: We're not checking OpenFGA here - not sure what to check for, since there's no
        // bommel yet in the tree

        return bommelRepo.createRoot(root);
    }

    @POST
    @Path("/")
    @Transactional
    public Bommel createBommel(Bommel bommel) {
        if (bommel.getParent() == null) {
            throw new WebApplicationException(
                    "Bommel has no parent, cannot create root bommel",
                    Response.Status.BAD_REQUEST);
        }

        checkUserHasPermission(bommel.getParent().id, "write");

        return bommelRepo.insertBommel(bommel);
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Bommel updateBommel(Bommel bommel, @PathParam("id") long id) {
        checkUserHasPermission(id, "write");

        var existingBommel = bommelRepo.findById(id);

        if (existingBommel == null) {
            throw new WebApplicationException(
                    "Could not find bommel with this id",
                    Response.Status.BAD_REQUEST);
        }

        existingBommel.merge(bommel);

        return existingBommel;
    }

    /**
     * Moves the bommel specified by id (first parameter) to the new parent (specified by newParentId)
     */
    @PUT
    @Path("/move/{id}/to/{newParentId}")
    @Transactional
    public Bommel moveBommel(@PathParam("id") long id, @PathParam("newParentId") long newParentId) {
        checkUserHasPermission(id, "write");
        checkUserHasPermission(newParentId, "write");

        Bommel base = bommelRepo.findById(id);
        Bommel parent = bommelRepo.findById(newParentId);

        if (base == null) {
            throw new WebApplicationException(
                    "Base bommel does not exist",
                    Response.Status.BAD_REQUEST);
        }

        if (parent == null) {
            throw new WebApplicationException(
                    "Parent bommel does not exist",
                    Response.Status.BAD_REQUEST);
        }

        return bommelRepo.moveBommel(base, parent);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public void deleteBommel(@PathParam("id") long id,
            @QueryParam("recursive") @DefaultValue("false") boolean recursive) {
        checkUserHasPermission(id, "write");

        Bommel base = bommelRepo.findById(id);

        if (base == null) {
            throw new WebApplicationException(
                    "Could not find bommel",
                    Response.Status.BAD_REQUEST);
        }

        bommelRepo.deleteBommel(base, recursive);
    }

    /**
     * Checks that the currently signed-in user can access this bommel with this relation. Throws a WebApplication
     * exception if anything goes wrong.
     */
    private void checkUserHasPermission(long bommelId, String relation) throws WebApplicationException {
        var principal = securityContext.getUserPrincipal();

        if (principal == null && this.authEnabled) {
            throw new WebApplicationException("User is not logged in", Response.Status.INTERNAL_SERVER_ERROR);
        }

        String username = principal == null ? "anonymous" : principal.getName();

        var accessTuple = TupleKey.of("bommel:" + bommelId, relation, "user:" + username);
        if (this.authEnabled && !authModelClient.check(accessTuple).await().indefinitely()) {
            throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        }
    }
}
