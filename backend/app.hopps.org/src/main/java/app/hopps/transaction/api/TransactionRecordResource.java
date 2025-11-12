package app.hopps.transaction.api;

import app.hopps.bommel.repository.BommelRepository;
import app.hopps.transaction.domain.TransactionRecord;
import app.hopps.transaction.repository.TransactionRecordRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.BeanParam;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.util.List;
import java.util.Optional;

@Authenticated
@Path("")
public class TransactionRecordResource {

    @Inject
    TransactionRecordRepository repository;

    @Inject
    BommelRepository bommelRepository;

    @GET
    @Path("/all")
    @Operation(summary = "Get all transaction records", description = "Fetches all transaction records with optional filters for bommel association")
    @APIResponse(responseCode = "200", description = "List of transaction records, empty list if none are available", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TransactionRecord[].class)))
    public List<TransactionRecord> getAll(@BeanParam AllParameters parameters) {
        parameters.verifyOnlyOneIsActive();
        Page page = new Page(parameters.getPageIndex(), parameters.getPageSize());

        if (parameters.getDetached().isPresent()) {
            return repository.findWithoutBommel(page);
        }

        Optional<Long> bommelId = parameters.getBommelId();
        if (bommelId.isPresent()) {
            return repository.findByBommelId(bommelId.get(), page);
        } else {
            return repository.findAll().page(page).list();
        }
    }

    // NOTE: This could be changed to {id}/bommel/{bommelId} to make it more obvious
    // that bommelId is a required parameter.
    // NOTE: Maybe add an endpoint to bommel that also does this?
    @PATCH
    @Transactional
    @Path("{id}/bommel/")
    @Operation(summary = "Add a transaction record to a bommel", description = "Attaches an transaction record to a bommel item")
    @APIResponse(responseCode = "200", description = "Specified transaction record was attached to bommel")
    @APIResponse(responseCode = "404", description = "Specified transaction record id was not found", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "400", description = "Bommel was not found", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public Response updateBommel(@PathParam("id") Long id, @QueryParam("bommelId") Long bommelId) {
        Optional<TransactionRecord> byIdOptional = repository.findByIdOptional(id);

        if (byIdOptional.isEmpty()) {
            throw new NotFoundException(Response
                    .status(Response.Status.NOT_FOUND)
                    .type(MediaType.TEXT_PLAIN)
                    .entity("Transaction record not found")
                    .build());
        }

        // TODO: Check that user has write permissions to bommel here
        // TODO: OpenFGA
        var maybeBommel = bommelRepository.findByIdOptional(bommelId);
        maybeBommel.orElseThrow(() -> new BadRequestException(Response
                .status(Response.Status.BAD_REQUEST)
                .type(MediaType.TEXT_PLAIN)
                .entity("Bommel not found")
                .build()));

        TransactionRecord transactionRecord = byIdOptional.get();
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
