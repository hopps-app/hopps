package app.hopps.organization.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.domain.TreeSearchBommel;
import app.hopps.bommel.repository.BommelRepository;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Path("/organizations")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
public class OrganizationBommelsResource {

    private static final String ORGANIZATION_NOT_FOUND = "Organization or root bommel not found";

    @Inject
    BommelRepository bommelRepository;

    @GET
    @Path("/{orgId}/bommels")
    @Operation(summary = "Fetch all bommels for an organization", description = "Retrieves the root bommel and all its children for the specified organization")
    @APIResponse(responseCode = "200", description = "All bommels for organization", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TreeSearchBommel[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "404", description = ORGANIZATION_NOT_FOUND, content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public List<TreeSearchBommel> getAllBommelsForOrganization(
            @PathParam("orgId") @Parameter(description = "The organization ID") long orgId) {

        Optional<Bommel> rootBommelOpt = bommelRepository.getRootBommel(orgId);

        if (rootBommelOpt.isEmpty()) {
            throw new WebApplicationException(
                    Response.status(Response.Status.NOT_FOUND)
                            .entity(ORGANIZATION_NOT_FOUND)
                            .build());
        }

        Bommel rootBommel = rootBommelOpt.get();

        List<TreeSearchBommel> allBommels = new ArrayList<>();

        // Add the root bommel as the first element
        TreeSearchBommel rootTreeSearchBommel = new TreeSearchBommel(
                rootBommel,
                false,
                List.of(rootBommel.id));
        allBommels.add(rootTreeSearchBommel);

        // Add all children recursively
        allBommels.addAll(bommelRepository.getChildrenRecursive(rootBommel));

        return allBommels;
    }
}
