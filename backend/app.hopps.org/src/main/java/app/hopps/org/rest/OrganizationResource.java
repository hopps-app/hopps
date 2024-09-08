package app.hopps.org.rest;

import app.hopps.org.jpa.Organization;
import app.hopps.org.rest.RestValidator.ValidationResult;
import jakarta.inject.Inject;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Validator;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Path("/organization")
public class OrganizationResource {

    private static final Logger LOG = LoggerFactory.getLogger(OrganizationResource.class);

    @Inject
    Validator validator;

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
            Response response = Response.status(HttpServletResponse.SC_BAD_REQUEST)
                    .entity(result)
                    .build();

            throw new BadRequestException(response);
        }

        return result;
    }
}
