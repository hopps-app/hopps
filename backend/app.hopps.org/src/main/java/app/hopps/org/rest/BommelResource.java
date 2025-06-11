package app.hopps.org.rest;

import app.hopps.org.jpa.Bommel;
import app.hopps.org.jpa.BommelRepository;
import app.hopps.org.jpa.OrganizationRepository;
import app.hopps.org.jpa.TreeSearchBommel;
import io.quarkiverse.openfga.client.AuthorizationModelClient;
import io.quarkus.runtime.configuration.ConfigUtils;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Path("/bommel")
@Authenticated
public class BommelResource {
    public static final String RELATION_WRITE = "write";
    public static final String BOMMEL_NOT_FOUND = "Bommel not found";
    public static final WebApplicationException NOT_FOUND_EXCEPTION = new WebApplicationException(
            Response.status(Response.Status.NOT_FOUND).entity(BOMMEL_NOT_FOUND).build());

    @Inject
    BommelRepository bommelRepo;

    @Inject
    OrganizationRepository orgRepo;

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
    @Operation(summary = "Fetch the children of bommel")
    @APIResponse(responseCode = "200", description = "Children of bommel", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Bommel[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "404", description = BOMMEL_NOT_FOUND, content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public Set<Bommel> getBommelChildren(@PathParam("id") long id) {
        checkUserHasPermission(id, "read");

        Optional<Bommel> base = bommelRepo.findByIdOptional(id);
        return throwOrGetBommel(base).getChildren();
    }

    @GET
    @Path("/{id}/children/recursive")
    @Operation(summary = "Fetch the children of bommel recursively")
    @APIResponse(responseCode = "200", description = "Recursive children of bommel", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TreeSearchBommel[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "404", description = BOMMEL_NOT_FOUND, content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public List<TreeSearchBommel> getBommelChildrenRecursive(@PathParam("id") long id) {
        checkUserHasPermission(id, "read");
        Optional<Bommel> base = bommelRepo.findByIdOptional(id);
        return bommelRepo.getChildrenRecursive(throwOrGetBommel(base));
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Fetch a bommel by its id")
    @APIResponse(responseCode = "200", description = "Bommel found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Bommel.class)))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "404", description = BOMMEL_NOT_FOUND, content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public Bommel getBommel(@PathParam("id") long id) {
        checkUserHasPermission(id, "read");

        Optional<Bommel> byIdOptional = bommelRepo.findByIdOptional(id);
        return throwOrGetBommel(byIdOptional);
    }

    @GET
    @Path("/root/{orgId}")
    @Operation(summary = "Fetch root-bommel for organization", description = """
            This endpoint is a duplicate of /organization/{slug}/bommels/root.
            If possible you should prefer the other endpoint, this one will be
            deprecated/deleted.
            """)
    @APIResponse(responseCode = "200", description = "Root-Bommel found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Bommel.class)))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "404", description = BOMMEL_NOT_FOUND, content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public Bommel getRootBommel(@PathParam("orgId") long orgId) {
        Optional<Bommel> rootBommelOpt = bommelRepo.getRootBommel(orgId);

        Bommel rootBommel = throwOrGetBommel(rootBommelOpt);

        checkUserHasPermission(rootBommel.id, "read");

        return rootBommel;
    }

    @POST
    @Path("/")
    @Transactional
    @Operation(summary = "Create bommel", description = "Create bommel underneath a root-bommel, without the parent-bommel it will fail.")
    @APIResponse(responseCode = "201", description = "Bommel successfully created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Bommel.class)))
    @APIResponse(responseCode = "400", description = "Bommel has no parent, cannot create root-bommel", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public Response createBommel(Bommel bommel) {
        if (bommel.getParent() == null) {
            throw new WebApplicationException(Response.status(Response.Status.BAD_REQUEST)
                    .entity("Bommel has no parent, cannot create root-bommel")
                    .build());
        }

        checkUserHasPermission(bommel.getParent().id, RELATION_WRITE);

        Bommel insertBommel = bommelRepo.insertBommel(bommel);
        URI uri = URI.create("/bommel/" + insertBommel.id + "/children");
        return Response.created(uri).entity(insertBommel).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Update bommel")
    @APIResponse(responseCode = "200", description = "Bommel successfully updated", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Bommel.class)))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "404", description = BOMMEL_NOT_FOUND, content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public Bommel updateBommel(Bommel bommel, @PathParam("id") long id) {
        checkUserHasPermission(id, RELATION_WRITE);

        Optional<Bommel> existingBommelOpt = bommelRepo.findByIdOptional(id);
        Bommel existingBommel = throwOrGetBommel(existingBommelOpt);

        existingBommel.merge(bommel);

        return existingBommel;
    }

    /**
     * Moves the bommel specified by id (first parameter) to the new parent (specified by newParentId)
     */
    @PUT
    @Path("/move/{id}/to/{newParentId}")
    @Transactional
    @Operation(summary = "Move a bommel underneath a different parent")
    @APIResponse(responseCode = "200", description = "Bommel successfully moved", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Bommel.class)))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized to move bommel", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "404", description = "<li>Bommel not found <li>New parent bommel not found", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public Bommel moveBommel(@PathParam("id") long id, @PathParam("newParentId") long newParentId) {
        checkUserHasPermission(id, RELATION_WRITE);
        checkUserHasPermission(newParentId, RELATION_WRITE);

        Bommel base = bommelRepo.findById(id);
        Bommel parent = bommelRepo.findById(newParentId);

        if (base == null) {
            throw new WebApplicationException(
                    Response.status(Response.Status.NOT_FOUND).entity("Base-Bommel not found").build());
        }

        if (parent == null) {
            throw new WebApplicationException(
                    Response.status(Response.Status.NOT_FOUND).entity("Parent-Bommel not found").build());
        }

        return bommelRepo.moveBommel(base, parent);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Delete bommel")
    @APIResponse(responseCode = "204", description = "Bommel successfully deleted")
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "404", description = BOMMEL_NOT_FOUND, content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public void deleteBommel(@PathParam("id") long id,
            @QueryParam("recursive") @DefaultValue("false") boolean recursive) {
        checkUserHasPermission(id, RELATION_WRITE);
        Bommel base = throwOrGetBommel(bommelRepo.findByIdOptional(id));
        bommelRepo.deleteBommel(base, recursive);
    }

    private void isUserLoggedIn() {
        var principal = securityContext.getUserPrincipal();

        if (principal == null && this.authEnabled) {
            throw new WebApplicationException("User is not logged in", Response.Status.UNAUTHORIZED);
        }
    }

    /**
     * Checks that the currently signed-in user can access this bommel with this relation. Throws a WebApplication
     * exception if anything goes wrong.
     */
    private void checkUserHasPermission(long bommelId, String relation) throws WebApplicationException {
        isUserLoggedIn();
        // FIXME implement this later after openfga is correctly implemented and has a schema
        // var principal = securityContext.getUserPrincipal();
        //
        // String username = principal == null ? "anonymous" : principal.getName();
        //
        // var accessTuple = TupleKey.of("bommel:" + bommelId, relation, "user:" + username);
        // if (this.authEnabled && Boolean.FALSE.equals(authModelClient.check(accessTuple).await().indefinitely())) {
        // throw new WebApplicationException(Response.Status.FORBIDDEN);
        // }
    }

    private Bommel throwOrGetBommel(Optional<Bommel> rootBommelOpt) {
        if (rootBommelOpt.isEmpty()) {
            throw NOT_FOUND_EXCEPTION;
        }
        return rootBommelOpt.get();
    }
}
