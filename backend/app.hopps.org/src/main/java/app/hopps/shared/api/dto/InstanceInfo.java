package app.hopps.shared.api.dto;

import app.hopps.shared.tenancy.TenancyConfig;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * What a client needs to know about this installation before anyone is logged in.
 *
 * @param tenancy
 *            whether the installation serves one organization or many
 * @param setupRequired
 *            true while a single-tenant installation still waits for its organization to be created. Always false in
 *            multi-tenant mode.
 * @param organizationName
 *            the name of the one organization of a single-tenant installation, once it exists; null otherwise
 */
@Schema(name = "InstanceInfo", description = "Public facts about this installation, available without logging in")
public record InstanceInfo(
        @Schema(description = "Whether this installation serves one organization (single) or many (multi)", examples = "single") TenancyConfig.Mode tenancy,
        @Schema(description = "True while a single-tenant installation still has to be set up, i.e. no organization exists yet", examples = "false") boolean setupRequired,
        @Schema(description = "Name of the organization of a single-tenant installation, once set up", examples = "Musterverein e.V.", nullable = true) String organizationName) {
}
