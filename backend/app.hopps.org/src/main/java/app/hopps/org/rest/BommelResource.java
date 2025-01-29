package app.hopps.org.rest;

import app.hopps.org.fga.FgaProxy;
import app.hopps.org.jpa.Bommel;
import app.hopps.org.jpa.BommelRepository;
import app.hopps.org.jpa.TreeSearchBommel;
import io.quarkiverse.zanzibar.annotations.FGAIgnore;
import io.quarkiverse.zanzibar.annotations.FGAPathObject;
import io.quarkiverse.zanzibar.annotations.FGARelation;
import io.quarkiverse.zanzibar.annotations.FGAUserType;
import io.quarkus.logging.Log;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
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
    public static final String BOMMEL_NOT_FOUND = "Bommel not found";
    public static final WebApplicationException NOT_FOUND_EXCEPTION = new WebApplicationException(
            Response.status(Response.Status.NOT_FOUND).entity(BOMMEL_NOT_FOUND).build());

    private final BommelRepository bommelRepo;
    private final SecurityContext securityContext;
    private final FgaProxy fgaProxy;

    @Inject
    public BommelResource(BommelRepository bommelRepo, SecurityContext securityContext, FgaProxy fgaProxy) {
        this.bommelRepo = bommelRepo;
        this.securityContext = securityContext;
        this.fgaProxy = fgaProxy;
    }

    @GET
    @Path("/{id}/children")
    @Operation(summary = "Fetch the children of bommel")
    @APIResponse(responseCode = "200", description = "Children of bommel", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Bommel[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "404", description = BOMMEL_NOT_FOUND, content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @FGARelation("member")
    @FGAUserType("user")
    @FGAPathObject(param = "id", type = "bommel")
    public Set<Bommel> getBommelChildren(@PathParam("id") long id) {
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
    @FGARelation("member")
    @FGAUserType("user")
    @FGAPathObject(param = "id", type = "bommel")
    public List<TreeSearchBommel> getBommelChildrenRecursive(@PathParam("id") long id) {
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
    @FGARelation("member")
    @FGAUserType("user")
    @FGAPathObject(param = "id", type = "bommel")
    public Bommel getBommel(@PathParam("id") long id) {
        Optional<Bommel> byIdOptional = bommelRepo.findByIdOptional(id);
        return throwOrGetBommel(byIdOptional);
    }

    @GET
    @Path("/root/{slug}")
    @Operation(summary = "Fetch root-bommel for organization")
    @APIResponse(responseCode = "200", description = "Root-Bommel found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Bommel.class)))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "404", description = BOMMEL_NOT_FOUND, content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @FGARelation("member")
    @FGAUserType("user")
    @FGAPathObject(param = "slug", type = "organization")
    public Bommel getRootBommel(@PathParam("slug") String slug) {
        Optional<Bommel> rootBommelOpt = bommelRepo.getRootBommel(slug);
        return throwOrGetBommel(rootBommelOpt);
    }

    @POST
    @Path("/")
    @Transactional
    @Consumes(MediaType.APPLICATION_JSON)
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

        fgaProxy.verifyEditorAccessToBommel(bommel.getParent().id, getUsername());

        Bommel insertBommel = bommelRepo.insertBommel(bommel);

        fgaProxy.addBommel(insertBommel, insertBommel.getParent().id);

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
    @FGARelation("bommelWart")
    @FGAUserType("user")
    @FGAPathObject(param = "id", type = "bommel")
    public Bommel updateBommel(Bommel bommel, @PathParam("id") long id) {
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
    @FGAIgnore
    public Bommel moveBommel(@PathParam("id") long id, @PathParam("newParentId") long newParentId) {
        fgaProxy.verifyEditorAccessToBommel(id, getUsername());
        fgaProxy.verifyEditorAccessToBommel(newParentId, getUsername());

        Bommel bommel = bommelRepo.findById(id);
        Bommel parentBommel = bommelRepo.findById(newParentId);

        if (bommel == null) {
            throw new WebApplicationException(
                    Response.status(Response.Status.NOT_FOUND).entity("Base-Bommel not found").build());
        }

        if (parentBommel == null) {
            throw new WebApplicationException(
                    Response.status(Response.Status.NOT_FOUND).entity("Parent-Bommel not found").build());
        }

        try {
            Long oldParentId = bommel.getParent().id;
            Bommel movedBommel = bommelRepo.moveBommel(bommel, parentBommel);

            fgaProxy.addBommel(bommel, parentBommel.id);
            fgaProxy.removeBommel(movedBommel, oldParentId);

            return movedBommel;
        } catch (Exception e) {
            Log.warn("Moving failed!", e);
            // Revert back the added Bommel
            fgaProxy.removeBommel(bommel, parentBommel.id);
            throw e;
        }
    }

    private String getUsername() {
        return securityContext.getUserPrincipal().getName();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Delete bommel")
    @APIResponse(responseCode = "204", description = "Bommel successfully deleted")
    @APIResponse(responseCode = "400", description = "Root-Bommel cannot be deleted", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "404", description = BOMMEL_NOT_FOUND, content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @FGARelation("bommelWart")
    @FGAUserType("user")
    @FGAPathObject(param = "id", type = "bommel")
    public void deleteBommel(@PathParam("id") long id,
            @QueryParam("recursive") @DefaultValue("false") boolean recursive) {
        Bommel bommel = throwOrGetBommel(bommelRepo.findByIdOptional(id));

        if (bommel.getParent() == null) {
            throw new WebApplicationException(
                    Response.status(Response.Status.BAD_REQUEST).entity("Root-Bommel cannot be deleted!").build());
        }

        bommelRepo.deleteBommel(bommel, recursive);

        // TODO: Herausfinden was possiert bei dem recursive call bei panache.
        // das macht beim fga updated probleme, da ich nicht weiß was ich löschen muss
        fgaProxy.removeBommel(bommel);
    }

    private Bommel throwOrGetBommel(Optional<Bommel> rootBommelOpt) {
        if (rootBommelOpt.isEmpty()) {
            throw NOT_FOUND_EXCEPTION;
        }
        return rootBommelOpt.get();
    }
}
