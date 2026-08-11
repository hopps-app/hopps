package app.hopps.organization.api;

import app.hopps.document.domain.ExtractionSource;
import app.hopps.member.domain.ImpersonationAudit;
import app.hopps.member.domain.Member;
import app.hopps.organization.api.dto.AdminOrganizationDetail;
import app.hopps.organization.api.dto.AdminOrganizationRow;
import app.hopps.organization.api.dto.ExtractionBreakdownResponse;
import app.hopps.organization.api.dto.ImpersonationTicket;
import app.hopps.organization.api.dto.LoginActivityResponse;
import app.hopps.organization.api.dto.MonthlyUploadResponse;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.AdminOrganizationRepository;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.Claims;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Admin-only API for monitoring and managing organizations. All endpoints require the realm {@code admin} role. Lives
 * under {@code /admin/organizations} (rather than {@code /organization}) to avoid colliding with the slug-based public
 * organization routes.
 */
@Path("/admin/organizations")
@RolesAllowed("admin")
@Produces(MediaType.APPLICATION_JSON)
public class AdminOrganizationResource {

    private static final Logger LOG = LoggerFactory.getLogger(AdminOrganizationResource.class);

    @Inject
    AdminOrganizationRepository adminRepository;

    @Inject
    JsonWebToken jwt;

    @GET
    @Transactional
    @Operation(summary = "List organizations", description = "Returns all organizations for the admin overview table, newest first. Soft-deleted organizations are excluded.")
    @APIResponse(responseCode = "200", description = "List of organizations", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = AdminOrganizationRow[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    public List<AdminOrganizationRow> list() {
        List<Organization> organizations = adminRepository.listByCreatedAt();

        List<Long> ids = organizations.stream().map(Organization::getId).toList();
        Map<Long, Long> belegeCounts = adminRepository.belegeCountByOrganization(ids);
        Map<Long, Instant> lastActivity = adminRepository.lastActivityByOrganization(ids);

        return organizations.stream()
                .map(org -> new AdminOrganizationRow(
                        org.getId(),
                        org.getName(),
                        org.getSlug(),
                        resolveContactEmail(org),
                        belegeCounts.getOrDefault(org.getId(), 0L),
                        lastActivity.get(org.getId()),
                        org.getCreatedAt()))
                .toList();
    }

    @GET
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Get organization detail", description = "Returns the full admin detail for a single organization, including members and aggregate counts.")
    @APIResponse(responseCode = "200", description = "Organization detail", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = AdminOrganizationDetail.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    @APIResponse(responseCode = "404", description = "Organization not found or soft-deleted")
    public AdminOrganizationDetail detail(
            @PathParam("id") @Parameter(description = "The organization id") Long id) {
        Organization org = findActiveOrThrow(id);
        return AdminOrganizationDetail.from(
                org,
                resolveContactEmail(org),
                adminRepository.documentCount(id),
                adminRepository.lastActivityByOrganization(List.of(id)).get(id),
                adminRepository.bankImportCount(id));
    }

    @GET
    @Path("/{id}/login-activity")
    @Transactional
    @Operation(summary = "Organization activity, as time spent in the application", description = "Seconds spent in the application per day by the organization over the last 7 days (oldest first), summed across its members, with days of no activity reported as zero. Because member time is summed, a day can exceed 24 hours when several members were active at once. Includes the organization's total member count so the figure can be related to how many people it is spread across.")
    @APIResponse(responseCode = "200", description = "Per-day time spent in the application", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = LoginActivityResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    @APIResponse(responseCode = "404", description = "Organization not found or soft-deleted")
    public LoginActivityResponse loginActivity(
            @PathParam("id") @Parameter(description = "The organization id") Long id) {
        Organization org = findActiveOrThrow(id);
        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(AdminOrganizationRepository.ACTIVITY_WINDOW_DAYS - 1L);
        return new LoginActivityResponse(
                org.getMembers().size(),
                adminRepository.dailyActiveSecondsForOrganization(id, from, today));
    }

    @GET
    @Path("/{id}/document-activity")
    @Transactional
    @Operation(summary = "Organization document-upload activity", description = "Number of uploaded documents (Belege) per month for the organization over the last 6 months (oldest first), with months of no uploads reported as zero.")
    @APIResponse(responseCode = "200", description = "Per-month document-upload activity", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = MonthlyUploadResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    @APIResponse(responseCode = "404", description = "Organization not found or soft-deleted")
    public MonthlyUploadResponse documentActivity(
            @PathParam("id") @Parameter(description = "The organization id") Long id) {
        findActiveOrThrow(id);
        LocalDate thisMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate from = thisMonth.minusMonths(AdminOrganizationRepository.WINDOW_MONTHS - 1L);
        return new MonthlyUploadResponse(
                adminRepository.monthlyUploadCountsForOrganization(id, from, thisMonth));
    }

    @GET
    @Path("/{id}/extraction-breakdown")
    @Transactional
    @Operation(summary = "Organization Beleg extraction breakdown", description = "All-time count of the organization's documents (Belege) grouped by how their data was extracted: ZUGFeRD (embedded XML), Azure Document AI, or manual entry. Not windowed. Documents with no recorded source (never analyzed, never edited) are counted as MANUAL, so the per-source counts sum to the total.")
    @APIResponse(responseCode = "200", description = "Per-source document counts", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ExtractionBreakdownResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    @APIResponse(responseCode = "404", description = "Organization not found or soft-deleted")
    public ExtractionBreakdownResponse extractionBreakdown(
            @PathParam("id") @Parameter(description = "The organization id") Long id) {
        findActiveOrThrow(id);
        Map<ExtractionSource, Long> counts = adminRepository.extractionBreakdownForOrganization(id);
        long total = counts.values().stream().mapToLong(Long::longValue).sum();
        return new ExtractionBreakdownResponse(total, counts);
    }

    @POST
    @Path("/{id}/members/{memberId}/impersonate")
    @Transactional
    @Operation(summary = "Authorise impersonation of a member", description = "Checks that the caller may impersonate the given member of the given organization, records the action in the impersonation audit log, and returns the member's Keycloak user id. It does not perform the impersonation: Keycloak's impersonation endpoint responds by setting SSO cookies on whoever calls it, so it must be called by the administrator's browser rather than by this service. Note that impersonating replaces the administrator's own Keycloak session in that browser.")
    @APIResponse(responseCode = "200", description = "Impersonation authorised and recorded", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ImpersonationTicket.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    @APIResponse(responseCode = "404", description = "Organization or member not found, or the member does not belong to that organization")
    @APIResponse(responseCode = "409", description = "The member has no Keycloak account and so cannot be impersonated")
    public ImpersonationTicket impersonate(
            @PathParam("id") @Parameter(description = "The organization id") Long id,
            @PathParam("memberId") @Parameter(description = "The member id") Long memberId) {
        Organization org = findActiveOrThrow(id);

        // re-check membership
        Member target = org.getMembers()
                .stream()
                .filter(m -> memberId.equals(m.id))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Member not found in this organization"));

        if (target.getKeycloakId() == null) {
            throw new ClientErrorException("Member has no Keycloak account", Response.Status.CONFLICT);
        }

        // record impersonation
        ImpersonationAudit.of(jwt.getSubject(), jwt.getClaim(Claims.email), target, org.getId(), Instant.now())
                .persist();
        LOG.info("Admin {} is impersonating member {} of organization {}", jwt.getSubject(), target.id, org.getId());

        String displayName = (target.getFirstName() + " " + target.getLastName()).trim();
        return new ImpersonationTicket(target.getKeycloakId(), displayName, target.getEmail());
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Soft-delete an organization", description = "Marks the organization as deleted (sets deleted_at). The organization and all its data are retained but hidden from every normal query; this is reversible at the database level. Idempotent per active organization.")
    @APIResponse(responseCode = "204", description = "Organization soft-deleted")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    @APIResponse(responseCode = "404", description = "Organization not found or already soft-deleted")
    public Response delete(@PathParam("id") @Parameter(description = "The organization id") Long id) {
        Organization org = findActiveOrThrow(id);
        org.setDeletedAt(Instant.now());
        adminRepository.persist(org);
        LOG.info("Soft-deleted organization {} ({})", org.getId(), org.getSlug());
        return Response.noContent().build();
    }

    /**
     * Loads an active organization by id, or throws 404. Guards defensively against {@code deletedAt} being set even if
     * a by-id load were to bypass the {@code @SQLRestriction}.
     */
    private Organization findActiveOrThrow(Long id) {
        Organization org = adminRepository.findById(id);
        if (org == null || org.getDeletedAt() != null) {
            throw new NotFoundException("Organization not found");
        }
        return org;
    }

    /**
     * The contact email for an organization: the owner (member responsible for the root bommel, set at registration),
     * falling back to any member, then null.
     */
    private static String resolveContactEmail(Organization org) {
        if (org.getRootBommel() != null && org.getRootBommel().getResponsibleMember() != null) {
            return org.getRootBommel().getResponsibleMember().getEmail();
        }
        return org.getMembers()
                .stream()
                .findFirst()
                .map(Member::getEmail)
                .orElse(null);
    }
}
