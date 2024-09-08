package app.hopps.org.rest;

import app.hopps.org.jpa.Member;
import app.hopps.org.rest.RestValidator.ValidationResult;
import jakarta.inject.Inject;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Validator;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Path("/member")
public class MemberResource {

    private static final Logger LOG = LoggerFactory.getLogger(MemberResource.class);

    @Inject
    Validator validator;

    @POST
    @Path(("/validate"))
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public ValidationResult validate(Member member) {

        ValidationResult result = RestValidator.forCandidate(member)
                .with(validator)
                .build();

        LOG.info("Validating Member {} {}", member.getFirstName(), member.getLastName());

        if (result.isValid() == ValidationResult.Validity.INVALID) {
            Response response = Response.status(HttpServletResponse.SC_BAD_REQUEST)
                    .entity(result)
                    .build();

            throw new BadRequestException(response);
        }

        return result;
    }
}
