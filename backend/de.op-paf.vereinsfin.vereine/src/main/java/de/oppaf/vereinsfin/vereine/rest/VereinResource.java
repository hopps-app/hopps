package de.oppaf.vereinsfin.vereine.rest;

import de.oppaf.vereinsfin.vereine.jpa.Verein;
import de.oppaf.vereinsfin.vereine.rest.RestValidator.ValidationResult;
import jakarta.inject.Inject;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Validator;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Path("/vereine")
public class VereinResource {

    private static final Logger LOG = LoggerFactory.getLogger(VereinResource.class);

    @Inject
    Validator validator;

    @POST
    @Path(("/validate"))
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ValidationResult validate(Verein verein) {

        ValidationResult result = RestValidator.forCandidate(verein)
                .with(validator)
                .build();

        LOG.info("Validating verein {}", verein.getName());

        if (result.isValid() == ValidationResult.Validity.INVALID) {
            Response response = Response.status(HttpServletResponse.SC_BAD_REQUEST)
                    .entity(result)
                    .build();

            throw new BadRequestException(response);
        }

        return result;
    }
}
