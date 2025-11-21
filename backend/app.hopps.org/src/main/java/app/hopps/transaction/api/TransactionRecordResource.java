package app.hopps.transaction.api;

import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.messaging.AnalysisEventBroadcaster;
import app.hopps.transaction.domain.TransactionRecord;
import app.hopps.transaction.domain.TransactionRecordAnalysisResult;
import app.hopps.transaction.repository.AnalysisResultRepository;
import app.hopps.transaction.repository.TransactionRecordRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.panache.common.Page;
import io.quarkus.security.Authenticated;
import io.smallrye.mutiny.Multi;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.RestStreamElementType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

@Authenticated
@Path("/transaction-records")
public class TransactionRecordResource {
    private static final Logger LOG = LoggerFactory.getLogger(TransactionRecordResource.class);

    @Inject
    TransactionRecordRepository repository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    AnalysisResultRepository analysisResultRepository;

    @Inject
    AnalysisEventBroadcaster broadcaster;

    @Inject
    ObjectMapper objectMapper;

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a single transaction record by ID")
    @APIResponse(responseCode = "200", description = "Transaction record found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TransactionRecord.class)))
    @APIResponse(responseCode = "404", description = "Transaction record not found")
    public Response getById(@PathParam("id") Long id) {
        TransactionRecord record = repository.findById(id);
        if (record == null) {
            throw new NotFoundException("Transaction record not found: " + id);
        }
        return Response.ok(record).build();
    }

    @GET
    @Path("/{id}/analysis")
    @Operation(summary = "Get analysis result for a transaction record")
    @APIResponse(responseCode = "200", description = "Analysis result found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TransactionRecordAnalysisResult.class)))
    @APIResponse(responseCode = "404", description = "Analysis result not found")
    public Response getAnalysisResult(@PathParam("id") Long id) {
        TransactionRecordAnalysisResult result = analysisResultRepository
                .findByTransactionRecordId(id)
                .orElseThrow(() -> new NotFoundException("Analysis result not found for transaction record: " + id));
        return Response.ok(result).build();
    }

    @GET
    @Path("/{id}/events")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestStreamElementType(MediaType.APPLICATION_JSON)
    @Operation(summary = "Subscribe to analysis events via Server-Sent Events")
    @APIResponse(responseCode = "200", description = "SSE stream established")
    @APIResponse(responseCode = "404", description = "Transaction record not found")
    public Multi<String> streamAnalysisEvents(@PathParam("id") Long id) {
        LOG.info("SSE connection established for transaction record: {}", id);

        // Create a holder for the event emitter
        AtomicReference<Multi<String>> eventStream = new AtomicReference<>();

        // Create a multi that emits events from the broadcaster
        Multi<String> events = Multi.createFrom().emitter(emitter -> {
            // Subscribe to broadcaster
            broadcaster.subscribe(id, event -> {
                try {
                    // Format SSE event
                    String eventData = objectMapper.writeValueAsString(event.data());
                    String sseEvent = "event: " + event.type() + "\ndata: " + eventData + "\n\n";
                    emitter.emit(sseEvent);
                } catch (Exception e) {
                    LOG.error("Error emitting SSE event", e);
                }
            });

            // Handle cancellation (client disconnect)
            emitter.onTermination(() -> {
                LOG.info("SSE connection closed for transaction record: {}", id);
                broadcaster.unsubscribe(id, null); // Clean up would need the consumer reference
            });
        });

        // Add keep-alive heartbeat every 30 seconds
        Multi<String> keepAlive = Multi.createFrom().ticks().every(Duration.ofSeconds(30))
                .onItem().transform(tick -> ":keepalive\n\n");

        // Merge events and keep-alive
        return Multi.createBy().merging().streams(events, keepAlive);
    }

    @PATCH
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(summary = "Update transaction record fields")
    @APIResponse(responseCode = "200", description = "Transaction record updated")
    @APIResponse(responseCode = "404", description = "Transaction record not found")
    public Response updateTransactionRecord(@PathParam("id") Long id, Map<String, Object> updates) {
        TransactionRecord record = repository.findById(id);
        if (record == null) {
            throw new NotFoundException("Transaction record not found: " + id);
        }

        // Apply updates - frontend decides what to save
        updates.forEach((field, value) -> {
            try {
                if (value == null) return; // Skip null values

                switch (field) {
                    case "total" -> record.setTotal(new java.math.BigDecimal(value.toString()));
                    case "name" -> record.setName(value.toString());
                    case "invoiceId" -> record.setInvoiceId(value.toString());
                    case "currencyCode" -> record.setCurrencyCode(value.toString());
                    case "orderNumber" -> record.setOrderNumber(value.toString());
                    case "transactionTime" -> record.setTransactionTime(java.time.Instant.parse(value.toString()));
                    case "dueDate" -> record.setDueDate(java.time.Instant.parse(value.toString()));
                    case "amountDue" -> record.setAmountDue(new java.math.BigDecimal(value.toString()));
                    // Add more fields as needed
                }
            } catch (Exception e) {
                LOG.warn("Could not update field {}: {}", field, e.getMessage());
            }
        });

        repository.persist(record);

        return Response.ok(record).build();
    }

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
