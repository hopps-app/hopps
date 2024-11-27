package app.hopps.fin.endpoint;

import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import io.quarkus.panache.common.Page;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.util.List;
import java.util.Optional;

@Path("")
public class TransactionRecordResource {

    @Inject
    TransactionRecordRepository repository;

    @GET
    @Path("/all")
    public List<TransactionRecord> getAll(@BeanParam AllParameters parameters) {
        parameters.verifyOnlyOneIsActive();

        Page page = new Page(parameters.getPageIndex(), parameters.getPageSize());

        if (parameters.getDetached().isPresent()) {
            return repository.findWithoutBommel(page);
        }

        if (parameters.getBommelId().isPresent()) {
            return repository.findByBommelId(parameters.getBommelId().get(), page);
        }

        return repository.findAll().page(page).list();
    }

    @PATCH
    @Transactional
    @Path("{id}/bommel")
    @Operation(summary = "Add a transaction record to a bommel", operationId = "updateBommel", description = "Attaches an transaction record to a bommel item")
    @APIResponse(description = "Specified transaction record id was not found", content = @Content(mediaType = MediaType.TEXT_PLAIN), responseCode = "404")
    @APIResponse(description = "Specified transaction record was attached to bommel", responseCode = "200")
    public Response updateBommel(@PathParam("id") Long id, @QueryParam("bommelId") Long bommelId) {
        Optional<TransactionRecord> byIdOptional = repository.findByIdOptional(id);

        if (byIdOptional.isEmpty()) {
            throw new NotFoundException(Response
                    .status(Response.Status.NOT_FOUND)
                    .type(MediaType.TEXT_PLAIN)
                    .entity("Transaction record not found")
                    .build());
        }

        TransactionRecord transactionRecord = byIdOptional.get();
        // TODO: Check if bommelId is available?
        transactionRecord.setBommelId(bommelId);
        repository.persist(transactionRecord);

        return Response
                .status(Response.Status.CREATED)
                .build();
    }

    public static class AllParameters {
        @Parameter(description = "Fetch all transaction records which are connected to the bommel")
        @QueryParam("bommelId")
        private Optional<Long> bommelId;

        @Parameter(description = "Fetch all transaction records which are not connected to any bommel")
        @QueryParam("detached")
        private Optional<Boolean> detached;

        @QueryParam("size")
        @DefaultValue("25")
        private int pageSize;

        @Parameter(description = "Current page you want to display, starts with 0")
        @QueryParam("page")
        @DefaultValue("0")
        private int pageIndex;

        public Optional<Long> getBommelId() {
            return bommelId;
        }

        public Optional<Boolean> getDetached() {
            return detached;
        }

        public int getPageSize() {
            return pageSize;
        }

        public int getPageIndex() {
            return pageIndex;
        }

        public void verifyOnlyOneIsActive() {
            if (bommelId.isPresent() && detached.isPresent()) {
                throw new BadRequestException(Response
                        .status(Response.Status.BAD_REQUEST)
                        .type(MediaType.TEXT_PLAIN)
                        .entity("Either set bommelId or detached not both!")
                        .build());
            }
        }
    }
}
