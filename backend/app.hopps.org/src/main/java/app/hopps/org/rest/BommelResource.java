package app.hopps.org.rest;

import app.hopps.org.jpa.Bommel;
import app.hopps.org.jpa.BommelRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;

import java.util.Optional;

@Path("/bommel")
public class BommelResource {

    @Inject
    BommelRepository bommelRepo;

    @GET
    @Path("/{id}")
    public Optional<Bommel> getBommel(@PathParam("id") long id) {
        return bommelRepo.findByIdOptional(id);
    }

    @POST
    @Path("/create-root")
    @Transactional
    public Bommel createRoot(Bommel root) {
        return bommelRepo.createRoot(root);
    }

    @POST
    @Path("/")
    @Transactional
    public Bommel createBommel(Bommel bommel) {
        if (bommel.getParent() == null) {
            throw new WebApplicationException(
                    "Bommel has no parent, cannot create root bommel",
                    Response.Status.BAD_REQUEST
            );
        }

        return bommelRepo.insertBommel(bommel);
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Bommel updateBommel(Bommel bommel, @PathParam("id") long id) {
        var existingBommel = bommelRepo.findById(id);

        if (existingBommel == null) {
            throw new WebApplicationException(
                    "Could not find bommel with this id",
                    Response.Status.BAD_REQUEST
            );
        }

        existingBommel.merge(bommel);

        return existingBommel;
    }

    /**
     * Moves the bommel specified by id (first parameter)
     * to the new parent (specified by newParentId)
     */
    @PUT
    @Path("/move/{id}/to/{newParentId}")
    @Transactional
    public Bommel moveBommel(@PathParam("id") long id, @PathParam("newParentId") long newParentId) {
        Bommel base = bommelRepo.findById(id);
        Bommel parent = bommelRepo.findById(newParentId);

        if (base == null) {
            throw new WebApplicationException(
                    "Base bommel does not exist",
                    Response.Status.BAD_REQUEST
            );
        }

        if (parent == null) {
            throw new WebApplicationException(
                    "Parent bommel does not exist",
                    Response.Status.BAD_REQUEST
            );
        }

        return bommelRepo.moveBommel(base, parent);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Bommel deleteBommel(@PathParam("id") long id, @QueryParam("recursive") @DefaultValue("false") boolean recursive) {
        Bommel base = bommelRepo.findById(id);

        if (base == null) {
            throw new WebApplicationException(
                    "Could not find bommel",
                    Response.Status.BAD_REQUEST
            );
        }

        bommelRepo.deleteBommel(base, recursive);

        return base;
    }

}
