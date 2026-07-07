package app.hopps.organization.api;

import app.hopps.member.domain.Member;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.model.NewOrganizationInput;
import app.hopps.organization.model.OrganizationInput;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.organization.service.OrganizationCreationService;
import app.hopps.shared.security.SecurityUtils;
import app.hopps.shared.validation.NonUniqueConstraintViolation;
import app.hopps.shared.validation.RestValidator;
import app.hopps.shared.validation.RestValidator.ValidationResult;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Path("/organization")
public class OrganizationResource {

    private static final Logger LOG = LoggerFactory.getLogger(OrganizationResource.class);

    @Inject
    Validator validator;

    @Inject
    OrganizationCreationService organizationCreationService;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    SecurityUtils securityUtils;

    @Inject
    JsonWebToken jwt;

    @GET
    @Path("{slug}")
    @Authenticated
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Get organization", description = "Retrieves the details of an organization using the unique slug identifier.")
    @APIResponse(responseCode = "200", description = "Organization retrieved successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Organization.class)))
    @APIResponse(responseCode = "404", description = "Organization not found for provided slug")
    public Response getOrganizationBySlug(@PathParam("slug") String slug) {

        Organization organization = organizationRepository.findBySlug(slug);
        if (organization == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(organization).build();
    }

    @GET
    @Path("/my")
    @Authenticated
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Get my organization", description = "Retrieves the details of an organization the current user is assigned to.")
    @APIResponse(responseCode = "200", description = "Own organization retrieved successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Organization.class)))
    @APIResponse(responseCode = "404", description = "Organization not found for user")
    public Organization getMyOrganization(@Context SecurityContext securityContext) {
        return securityUtils.getUserOrganization(securityContext);
    }

    @PUT
    @Path("/my")
    @Authenticated
    @Transactional
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Update my organization", description = "Updates the details of the current user's organization. Fields like name, address, website, and type can be changed.")
    @APIResponse(responseCode = "200", description = "Organization updated successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Organization.class)))
    @APIResponse(responseCode = "400", description = "Validation of fields failed", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ValidationResult.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Organization not found for user")
    public Response updateMyOrganization(@Context SecurityContext securityContext, OrganizationInput input) {
        Organization organization = securityUtils.getUserOrganization(securityContext);

        if (input.name() != null) {
            organization.setName(input.name());
            organization.getRootBommel().setName(input.name());
        }
        if (input.type() != null) {
            organization.setType(input.type());
        }
        if (input.website() != null) {
            organization.setWebsite(input.website());
        }
        if (input.profilePicture() != null) {
            organization.setProfilePicture(input.profilePicture());
        }
        if (input.address() != null) {
            organization.setAddress(input.address());
        }
        if (input.foundingDate() != null) {
            organization.setFoundingDate(input.foundingDate());
        }
        if (input.registrationCourt() != null) {
            organization.setRegistrationCourt(input.registrationCourt());
        }
        if (input.registrationNumber() != null) {
            organization.setRegistrationNumber(input.registrationNumber());
        }
        if (input.country() != null) {
            organization.setCountry(input.country());
        }
        if (input.taxNumber() != null) {
            organization.setTaxNumber(input.taxNumber());
        }
        if (input.email() != null) {
            organization.setEmail(input.email());
        }
        if (input.phoneNumber() != null) {
            organization.setPhoneNumber(input.phoneNumber());
        }
        if (input.autoAnalyzeDocuments() != null) {
            organization.setAutoAnalyzeDocuments(input.autoAnalyzeDocuments());
        }

        organizationRepository.persist(organization);
        organizationRepository.flush();

        // Initialize lazy collections before transaction ends to avoid LazyInitializationException during serialization
        organization.getMembers().size();

        LOG.info("Successfully updated organization: {}", organization.getSlug());
        return Response.ok(organization).build();
    }

    @POST
    @Path("/my")
    @Authenticated
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Create my organization", description = "Creates a new organization and links it to the already-authenticated user (found or created by their Keycloak id) — without provisioning a new Keycloak user. The organization becomes the user's default organization on the next login.")
    @APIResponse(responseCode = "201", description = "Organization created and linked to the current user", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Organization.class)))
    @APIResponse(responseCode = "400", description = "Validation of fields failed")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "409", description = "Slug already exists, or the user is already assigned to an organization")
    public Response createMyOrganization(OrganizationInput input) {
        Organization organization = input.toOrganization();

        String keycloakId = jwt.getSubject();
        String email = firstNonBlank(jwt.getClaim("email"), jwt.getName());
        String firstName = firstNonBlank(jwt.getClaim("given_name"), jwt.getClaim("preferred_username"),
                localPart(email), "Konto");
        String lastName = firstNonBlank(jwt.getClaim("family_name"), "-");

        try {
            organizationCreationService.createOrganizationForCurrentUser(organization, keycloakId, email, firstName,
                    lastName);
        } catch (ConstraintViolationException e) {
            LOG.warn("Validation failed for organization creation: {}", e.getMessage());
            throw new BadRequestException(Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build());
        } catch (NonUniqueConstraintViolation.NonUniqueConstraintViolationException e) {
            LOG.warn("Uniqueness constraint violation: {}", e.getMessage());
            Set<String> conflictingFields = e.getViolations()
                    .stream()
                    .map(NonUniqueConstraintViolation::field)
                    .collect(Collectors.toSet());
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("conflictingFields", conflictingFields))
                    .build();
        }

        LOG.info("Successfully created organization for current user: {}", organization.getSlug());
        return Response.status(Response.Status.CREATED).entity(organization).build();
    }

    /** Returns the first non-null, non-blank value, or {@code null} if none. */
    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    /** The part of an email address before the {@code @}, used as a fallback first name. */
    private static String localPart(String email) {
        if (email == null) {
            return null;
        }
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }

    @GET
    @Path("{slug}/members")
    @Authenticated
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Get organization members", description = "Retrieves the members of an organization using the unique slug identifier.")
    @APIResponse(responseCode = "200", description = "Members retrieved successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Member[].class)))
    @APIResponse(responseCode = "404", description = "Organization not found for provided slug")
    public Response getOrganizationMembersBySlug(@PathParam("slug") String slug) {
        Organization organization = organizationRepository.findBySlug(slug);
        if (organization == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(organization.getMembers()).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Create a new organization")
    @APIResponse(responseCode = "201", description = "Organization created successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Organization.class)))
    @APIResponse(responseCode = "400", description = "Validation of fields failed", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ValidationResult.class)))
    @APIResponse(responseCode = "409", description = "Email or slug already exists", content = @Content(mediaType = MediaType.APPLICATION_JSON))
    public Response create(NewOrganizationInput input) {
        Organization organization = input.toOrganization();
        Member owner = input.toOwner();

        try {
            organizationCreationService.createOrganization(organization, owner, input.newPassword());
        } catch (ConstraintViolationException e) {
            LOG.warn("Validation failed for organization creation: {}", e.getMessage());
            throw new BadRequestException(
                    Response.status(Response.Status.BAD_REQUEST)
                            .entity(e.getMessage())
                            .build());
        } catch (NonUniqueConstraintViolation.NonUniqueConstraintViolationException e) {
            LOG.warn("Uniqueness constraint violation: {}", e.getMessage());
            Set<String> conflictingFields = e.getViolations()
                    .stream()
                    .map(NonUniqueConstraintViolation::field)
                    .collect(Collectors.toSet());
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("conflictingFields", conflictingFields))
                    .build();
        }

        LOG.info("Successfully created organization: {}", organization.getSlug());
        return Response.status(Response.Status.CREATED)
                .entity(organization)
                .build();
    }

    @POST
    @Path(("validate"))
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Validates the organization input")
    @APIResponse(responseCode = "200", description = "Validation successful", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ValidationResult.class)))
    @APIResponse(responseCode = "400", description = "Validation failed", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ValidationResult.class)))
    public ValidationResult validate(Organization organization) {

        ValidationResult result = RestValidator.forCandidate(organization)
                .with(validator)
                .build();

        LOG.info("Validating Organization {}", organization.getName());

        if (result.isValid() == ValidationResult.Validity.INVALID) {
            Response response = Response.status(Response.Status.BAD_REQUEST).entity(result).build();
            throw new BadRequestException(response);
        }

        return result;
    }
}
