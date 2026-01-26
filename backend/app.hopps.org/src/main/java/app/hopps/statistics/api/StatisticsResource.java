package app.hopps.statistics.api;

import app.hopps.statistics.api.dto.BommelStatistics;
import app.hopps.statistics.api.dto.BommelStatisticsMap;
import app.hopps.statistics.api.dto.OrganizationStatistics;
import app.hopps.statistics.service.StatisticsService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

@Path("/statistics")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
public class StatisticsResource {

    @Inject
    StatisticsService statisticsService;

    @GET
    @Path("/organizations/{orgId}")
    @Operation(summary = "Get organization statistics", description = "Returns aggregated statistics for the entire organization including total bommels, "
            +
            "receipts count, total income, total expenses, and balance")
    @APIResponse(responseCode = "200", description = "Organization statistics", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = OrganizationStatistics.class)))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public OrganizationStatistics getOrganizationStatistics(
            @PathParam("orgId") @Parameter(description = "The organization ID") long orgId,
            @QueryParam("includeDrafts") @DefaultValue("false") @Parameter(description = "Whether to include draft transactions in the statistics") boolean includeDrafts) {
        return statisticsService.getOrganizationStatistics(orgId, includeDrafts);
    }

    @GET
    @Path("/bommels/{bommelId}")
    @Operation(summary = "Get bommel statistics", description = "Returns statistics for a specific bommel including income, expenses, balance, "
            +
            "and receipt count. Optionally aggregates data from all child bommels.")
    @APIResponse(responseCode = "200", description = "Bommel statistics", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BommelStatistics.class)))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "404", description = "Bommel not found", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public BommelStatistics getBommelStatistics(
            @PathParam("bommelId") @Parameter(description = "The bommel ID") long bommelId,
            @QueryParam("includeDrafts") @DefaultValue("false") @Parameter(description = "Whether to include draft transactions in the statistics") boolean includeDrafts,
            @QueryParam("aggregate") @DefaultValue("false") @Parameter(description = "Whether to aggregate statistics from all child bommels") boolean aggregate) {
        BommelStatistics stats = statisticsService.getBommelStatistics(bommelId, includeDrafts, aggregate);
        if (stats == null) {
            throw new WebApplicationException(
                    Response.status(Response.Status.NOT_FOUND)
                            .entity("Bommel not found")
                            .build());
        }
        return stats;
    }

    @GET
    @Path("/organizations/{orgId}/bommels")
    @Operation(summary = "Get statistics for all bommels in an organization", description = "Returns statistics for all bommels in the organization as a map. "
            +
            "Optionally aggregates data from child bommels for each entry.")
    @APIResponse(responseCode = "200", description = "Map of bommel statistics", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BommelStatisticsMap.class)))
    @APIResponse(responseCode = "401", description = "User not logged in", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    @APIResponse(responseCode = "403", description = "User not authorized", content = @Content(mediaType = MediaType.TEXT_PLAIN))
    public BommelStatisticsMap getAllBommelStatistics(
            @PathParam("orgId") @Parameter(description = "The organization ID") long orgId,
            @QueryParam("includeDrafts") @DefaultValue("false") @Parameter(description = "Whether to include draft transactions in the statistics") boolean includeDrafts,
            @QueryParam("aggregate") @DefaultValue("false") @Parameter(description = "Whether to aggregate statistics from all child bommels") boolean aggregate) {
        return statisticsService.getAllBommelStatistics(orgId, includeDrafts, aggregate);
    }
}
