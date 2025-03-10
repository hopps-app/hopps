package app.hopps.fin.endpoint;

import app.hopps.fin.S3Handler;
import app.hopps.fin.client.OrgRestClient;
import app.hopps.fin.fga.FgaProxy;
import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
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
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.resteasy.reactive.ClientWebApplicationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import java.util.List;
import java.util.Optional;

@Authenticated
@Path("")
public class TransactionRecordResource {
    private static final Logger LOG = LoggerFactory.getLogger(TransactionRecordResource.class);

    private final TransactionRecordRepository repository;
    private final OrgRestClient orgRestClient;
    private final S3Handler s3Handler;
    private final FgaProxy fgaProxy;
    private final SecurityContext securityContext;

    @Inject
    public TransactionRecordResource(TransactionRecordRepository repository,
            @RestClient OrgRestClient orgRestClient,
            S3Handler s3Handler, FgaProxy fgaProxy, SecurityContext securityContext) {
        this.repository = repository;
        this.orgRestClient = orgRestClient;
        this.s3Handler = s3Handler;
        this.fgaProxy = fgaProxy;
        this.securityContext = securityContext;
    }

    @GET
    @Path("/all")
    @Operation(summary = "Get all transaction records", description = "Fetches all transaction records with optional filters for bommel association")
    @APIResponse(responseCode = "200", description = "List of transaction records, empty list if none are available", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TransactionRecord[].class)))
    public List<TransactionRecord> getAll(@BeanParam AllParameters parameters) {
        parameters.verifyOnlyOneIsActive();
        Page page = new Page(parameters.getPageIndex(), parameters.getPageSize());

        Optional<Boolean> detached = parameters.getDetached();
        if (detached.isPresent() && Boolean.TRUE.equals(detached.get())) {
            // Records without bommelId have no permissions
            return repository.findWithoutBommel(page);
        }

        Optional<Long> bommelIdOpt = parameters.getBommelId();
        if (bommelIdOpt.isPresent()) {
            Long bommelId = bommelIdOpt.get();
            verifyPermission(bommelId);
            return repository.findByBommelId(bommelId, page);
        } else {
            boolean withDetachedBommels = detached.orElse(true);
            List<Long> accessibleBommels = fgaProxy.getAccessibleBommels(securityContext.getUserPrincipal().getName());
            return repository.findAll(accessibleBommels, withDetachedBommels).page(page).list();
        }
    }

    @GET
    @Path("/{id}/document")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public byte[] getDocumentByKey(@PathParam("id") Long transactionId) {
        TransactionRecord transactionRecord = getTransactionRecordAndVerify(transactionId);

        String documentKey = transactionRecord.getDocumentKey();
        try {
            return s3Handler.getFile(documentKey);
        } catch (NoSuchKeyException ignored) {
            LOG.info("File with key {} not found", documentKey);
            throw new NotFoundException(Response.status(Response.Status.NOT_FOUND)
                    .entity("Document with key " + documentKey + " not found")
                    .build());
        }
    }

    @PATCH
    @Transactional
    @Path("{id}/bommel")
    @Operation(summary = "Add a transaction record to a bommel", description = "Attaches an transaction record to a bommel item")
    @APIResponse(responseCode = "200", description = "Specified transaction record was attached to bommel")
    @APIResponse(responseCode = "404", description = "Specified transaction record id was not found", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "400", description = "Bommel was not found", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public Response updateBommel(@PathParam("id") Long id, @QueryParam("bommelId") Long bommelId) {
        TransactionRecord transactionRecord = getTransactionRecordAndVerify(id);
        verifyPermission(bommelId);

        try {
            // Just check if bommel is available
            orgRestClient.getBommel(bommelId);
        } catch (ClientWebApplicationException clientWebApplicationException) {
            int status = clientWebApplicationException.getResponse().getStatus();

            if (status == Response.Status.NOT_FOUND.getStatusCode()) {
                throw new WebApplicationException(Response
                        .status(Response.Status.BAD_REQUEST)
                        .type(MediaType.TEXT_PLAIN)
                        .entity("Bommel not found")
                        .build());
            }

            throw new WebApplicationException(clientWebApplicationException.getResponse());
        }

        transactionRecord.setBommelId(bommelId);
        repository.persist(transactionRecord);

        return Response
                .status(Response.Status.CREATED)
                .build();
    }

    private TransactionRecord getTransactionRecordAndVerify(Long transactionId) {
        Optional<TransactionRecord> byIdOptional = repository.findByIdOptional(transactionId);
        if (byIdOptional.isEmpty()) {
            throw new NotFoundException(Response
                    .status(Response.Status.NOT_FOUND)
                    .type(MediaType.TEXT_PLAIN)
                    .entity("Transaction record not found")
                    .build());
        }
        TransactionRecord transactionRecord = byIdOptional.get();

        verifyPermission(transactionRecord.getBommelId());
        return transactionRecord;
    }

    /**
     * @throws WebApplicationException
     *             with {@code jakarta.ws.rs.core.Response.Status.FORBIDDEN} when user is not allowed
     */
    private void verifyPermission(Long bommelId) {
        // Allow seeing if no bommel was set
        if (bommelId == null) {
            return;
        }

        fgaProxy.verifyAccessToBommel(bommelId, securityContext.getUserPrincipal().getName());
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
