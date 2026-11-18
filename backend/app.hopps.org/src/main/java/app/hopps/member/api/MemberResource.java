package app.hopps.member.api;

import app.hopps.member.api.dto.MyProfileResponse;
import app.hopps.member.domain.Member;
import app.hopps.member.model.MemberProfileInput;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.AccessService;
import app.hopps.shared.security.SecurityUtils;
import app.hopps.shared.validation.RestValidator;
import app.hopps.shared.validation.RestValidator.ValidationResult;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Set;
import java.util.stream.Collectors;

@Path("/member")
@Authenticated
public class MemberResource {

    private static final Logger LOG = LoggerFactory.getLogger(MemberResource.class);

    private final Validator validator;
    private final SecurityUtils securityUtils;
    private final AccessService accessService;

    @Inject
    public MemberResource(Validator validator, SecurityUtils securityUtils, AccessService accessService) {
        this.validator = validator;
        this.securityUtils = securityUtils;
        this.accessService = accessService;
    }

    @GET
    @Path("me")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "getMyProfile", summary = "Get my profile", description = "Returns the current user's details, their organization, and their role and permissions in it.")
    @APIResponse(responseCode = "200", description = "The current user's profile", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = MyProfileResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not a member of any organization (code NO_ORGANIZATION_ACCESS)")
    public MyProfileResponse getMyProfile(@Context SecurityContext securityContext) {
        Member me = securityUtils.getCurrentUser(securityContext);
        Organization organization = securityUtils.getUserOrganization(securityContext);
        return MyProfileResponse.of(me, organization, accessService.permissions(me, organization));
    }

    @PUT
    @Path("me")
    @Transactional
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "updateMyProfile", summary = "Update my profile", description = "Changes the current user's name and phone number. A name left out keeps its value; an empty phone number removes it. The email address is managed by the sign-in service and cannot be changed here.")
    @APIResponse(responseCode = "200", description = "Profile updated", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = MyProfileResponse.class)))
    @APIResponse(responseCode = "400", description = "A name is blank, or the phone number is too long or contains other characters than digits, spaces and + ( ) / . -")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not a member of any organization (code NO_ORGANIZATION_ACCESS)")
    public MyProfileResponse updateMyProfile(@Context SecurityContext securityContext,
            @Parameter(description = "The changed details") MemberProfileInput input) {
        Member me = securityUtils.getCurrentUser(securityContext);
        Organization organization = securityUtils.getUserOrganization(securityContext);

        if (input != null) {
            if (input.firstName() != null) {
                me.setFirstName(input.firstName().trim());
            }
            if (input.lastName() != null) {
                me.setLastName(input.lastName().trim());
            }
            String phoneNumber = input.phoneNumber() == null ? null : input.phoneNumber().trim();
            me.setPhoneNumber(phoneNumber == null || phoneNumber.isEmpty() ? null : phoneNumber);
        }

        Set<ConstraintViolation<Member>> violations = validator.validate(me);
        if (!violations.isEmpty()) {
            String message = violations.stream()
                    .map(violation -> violation.getPropertyPath() + " " + violation.getMessage())
                    .collect(Collectors.joining(", "));
            throw new BadRequestException(Response.status(Response.Status.BAD_REQUEST).entity(message).build());
        }

        LOG.info("Member {} updated their profile", me.getEmail());
        return MyProfileResponse.of(me, organization, accessService.permissions(me, organization));
    }

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
}
