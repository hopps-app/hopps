package app.hopps.org.rest;

import app.hopps.org.jpa.Member;
import app.hopps.org.rest.RestValidator.ValidationResult;
import jakarta.inject.Inject;
import jakarta.validation.Validator;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Path("/member")
public class MemberResource {

    private static final Logger LOG = LoggerFactory.getLogger(MemberResource.class);

    private final Validator validator;

    @Inject
    public MemberResource(Validator validator) {
        this.validator = validator;
    }

    @POST
    @Path(("/validate"))
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Validates the member input", operationId = "validate")
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
}
