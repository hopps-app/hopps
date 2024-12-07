package app.hopps.org.rest;

import app.hopps.org.jpa.Organization;
import app.hopps.org.rest.RestValidator.ValidationResult;
import app.hopps.org.rest.model.NewOrganizationInput;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import jakarta.validation.Validator;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.kie.kogito.Model;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

@Path("/organization")
public class OrganizationResource {
    private static final Logger LOG = LoggerFactory.getLogger(OrganizationResource.class);

    @Inject
    Validator validator;

    @Inject
    @Named("NewOrganization")
    Process<? extends Model> process;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Create a new organization", operationId = "createNewOrganization")
    @APIResponse(responseCode = "202", description = "Creation started successfully")
    @APIResponse(responseCode = "400", description = "Validation of fields failed", content = @Content(mediaType = MediaType.APPLICATION_JSON))
    public Response create(NewOrganizationInput input) {
        Model model = process.createModel();
        Map<String, Object> newOrganizationParameters = input.toModel();
        model.fromMap(newOrganizationParameters);
        ProcessInstance<? extends Model> instance = process.createInstance(model);
        instance.start();

        return Response.accepted().entity(instance).entity(instance.id()).build();
    }

    @POST
    @Path(("/validate"))
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ValidationResult validate(Organization organization) {

        ValidationResult result = RestValidator.forCandidate(organization)
                .with(validator)
                .build();

        LOG.info("Validating Organization {}", organization.getName());

        if (result.isValid() == ValidationResult.Validity.INVALID) {
            Response response = Response.status(Response.Status.BAD_REQUEST)
                    .entity(result)
                    .build();

            throw new BadRequestException(response);
        }

        return result;
    }
}
