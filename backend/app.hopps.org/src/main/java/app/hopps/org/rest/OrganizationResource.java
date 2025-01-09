package app.hopps.org.rest;

import app.hopps.org.jpa.Member;
import app.hopps.org.jpa.MemberRepository;
import app.hopps.org.jpa.Organization;
import app.hopps.org.jpa.OrganizationRepository;
import app.hopps.org.rest.RestValidator.ValidationResult;
import app.hopps.org.rest.model.NewOrganizationInput;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import jakarta.validation.Validator;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.kie.kogito.Model;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collection;
import java.util.Map;

@Path("/organization")
public class OrganizationResource {

    private static final Logger LOG = LoggerFactory.getLogger(OrganizationResource.class);

    @Inject
    Validator validator;

    @Inject
    @Named("NewOrganization")
    Process<? extends Model> process;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    MemberRepository memberRepository;

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

        String userName = securityContext.getUserPrincipal().getName();
        Member me = memberRepository.findByEmail(userName);
        if (me == null) {
            throw new NotFoundException("Organization of User not found");
        }

        Collection<Organization> orgs = me.getOrganizations();
        if (orgs.size() > 1) {
            throw new IllegalStateException(
                    "More than one organization is currently not implemented. User:  " + userName);
        }

        return orgs.stream().findFirst().orElseThrow();
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
    @Operation(summary = "Create a new organization")
    @APIResponse(responseCode = "201", description = "Creation started successfully", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "400", description = "Validation of fields failed", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ValidationResult.class)))
    public Response create(NewOrganizationInput input) {
        Model model = process.createModel();
        Map<String, Object> newOrganizationParameters = input.toModel();
        model.fromMap(newOrganizationParameters);
        ProcessInstance<? extends Model> instance = process.createInstance(model);
        instance.start();

        return Response.accepted()
                .entity(instance.id())
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
