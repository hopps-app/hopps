package app.hopps.shared.api;

import app.hopps.organization.domain.Organization;
import app.hopps.shared.api.dto.InstanceInfo;
import app.hopps.shared.tenancy.TenancyService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * Public, unauthenticated facts about this installation. The SPA reads them before login to decide whether to offer
 * sign-up, the initial setup, or only the login button — the backend is the single source of truth for the tenancy
 * mode, so the frontend never needs a configuration value of its own that could disagree with it.
 */
@Path("/instance")
public class InstanceResource {

    @Inject
    TenancyService tenancyService;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Describe this installation", description = "Returns the tenancy mode of this installation, whether the initial setup of a single-tenant installation is still pending, and — once set up — the name of its organization. Public; no authentication required.")
    @APIResponse(responseCode = "200", description = "Installation facts", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = InstanceInfo.class)))
    public InstanceInfo instance() {
        String organizationName = tenancyService.singleOrganization().map(Organization::getName).orElse(null);
        return new InstanceInfo(tenancyService.mode(), tenancyService.isSetupRequired(), organizationName);
    }
}
