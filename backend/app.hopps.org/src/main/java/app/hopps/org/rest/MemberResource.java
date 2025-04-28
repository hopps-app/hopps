package app.hopps.org.rest;

import app.hopps.org.jpa.Member;
import app.hopps.org.rest.RestValidator.ValidationResult;
import io.quarkus.security.Authenticated;
import jakarta.annotation.Nullable;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import jakarta.validation.Validator;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.kie.kogito.Model;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;
import org.kie.kogito.process.WorkItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.NoSuchElementException;

@Path("/member")
@Authenticated
public class MemberResource {

    private static final Logger LOG = LoggerFactory.getLogger(MemberResource.class);

    private final Validator validator;

    @Inject
    public MemberResource(Validator validator) {
        this.validator = validator;
    }

    @Inject
    @Named("AddMember")
    Process<Map<String, Object>> addMemberProcess;

    @POST
    @Path(("validate"))
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Validates the member input")
    @APIResponse(responseCode = "200", description = "Validation successful", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ValidationResult.class)))
    @APIResponse(responseCode = "400", description = "Validation failed", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ValidationResult.class)))
    public ValidationResult validate(Member member) {

        ValidationResult result = RestValidator.forCandidate(member)
                .with(validator)
                .build();

        LOG.info("Validating Member {} {}", member.getFirstName(), member.getLastName());

        if (result.isValid() == ValidationResult.Validity.INVALID) {
            Response response = Response.status(Response.Status.BAD_REQUEST).entity(result).build();
            throw new BadRequestException(response);
        }

        return result;
    }

    @POST
    @Path(("invitation/accept"))
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Confirms the invitation to an organization")
    @APIResponse(responseCode = "200", description = "Invitation accepted successful")
    @APIResponse(responseCode = "400", description = "Missing or bad data")
    @APIResponse(responseCode = "404", description = "Resource not found")
    public Response confirmInvitation(@Nullable Member member, @QueryParam("pid") String pid) {
        try {
            ProcessInstance<Map<String, Object>> currentProcess = addMemberProcess.instances()
                    .stream()
                    .filter(p -> p.id().equals(pid))
                    .findFirst()
                    .orElseThrow();

            if(currentProcess.status() != ProcessInstance.STATE_ACTIVE) {
                return Response.status(400, "The invitation is not valid anymore").build();
            }

            Map<String, Object> processData = (Map<String, Object>) currentProcess.variables();

            if((Boolean) processData.get("memberDoesExist")) {
                WorkItem wi = currentProcess
                        .workItems(p -> p.getNode().getName().equals("accept invite"))
                        .stream()
                        .findFirst()
                        .orElseThrow();

                currentProcess.completeWorkItem(wi.getId(), Map.of());

                return Response.ok().build();
            } else {
                if(member == null) {
                    throw new BadRequestException();
                }

                ValidationResult result = RestValidator.forCandidate(member)
                        .with(validator)
                        .build();

                if (result.isValid() == ValidationResult.Validity.INVALID) {
                    Response response = Response.status(Response.Status.BAD_REQUEST).entity(result).build();
                    throw new BadRequestException(response);
                }

                processData.put("member", member);
                currentProcess.updateVariables(processData);

                return Response.ok().build();
            }
        } catch (NoSuchElementException e) {
            throw new NotFoundException();
        }
    }
}
