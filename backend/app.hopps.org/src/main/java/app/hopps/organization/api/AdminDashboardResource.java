package app.hopps.organization.api;

import app.hopps.organization.api.dto.DashboardResponse;
import app.hopps.organization.repository.AdminOrganizationRepository;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.time.LocalDate;

/**
 * Admin-only estate-wide figures for the Übersicht. Separate from {@link AdminOrganizationResource} because nothing
 * here is about one organization — every figure spans the whole estate.
 */
@Path("/admin/dashboard")
@RolesAllowed("admin")
@Produces(MediaType.APPLICATION_JSON)
public class AdminDashboardResource {

    /**
     * How far back the overview's monthly series reach, in months (inclusive of the current month). Shared by the
     * signup and extraction charts so the two sit on the same x-axis and can be read against each other.
     */
    public static final int WINDOW_MONTHS = 12;

    /**
     * How far back the daily series reach, in days (inclusive of today). A week: long enough to show a shape, short
     * enough that "aktiv in den letzten 7 Tagen" means something concrete to someone doing support.
     */
    public static final int ACTIVITY_WINDOW_DAYS = 7;

    @Inject
    AdminOrganizationRepository adminRepository;

    @GET
    @Transactional
    @Operation(summary = "Admin overview figures", description = "Estate-wide figures for the admin overview: how many organizations exist and when they registered, how much time was spent in the application per day and how many organizations were active over the last week, and how many documents were uploaded per month together with how their data was extracted. All figures exclude soft-deleted organizations.")
    @APIResponse(responseCode = "200", description = "Overview figures", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DashboardResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    public DashboardResponse overview() {
        LocalDate thisMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate firstMonth = thisMonth.minusMonths(WINDOW_MONTHS - 1L);

        LocalDate today = LocalDate.now();
        LocalDate firstDay = today.minusDays(ACTIVITY_WINDOW_DAYS - 1L);

        return new DashboardResponse(
                adminRepository.count(),
                adminRepository.monthlySignupCounts(firstMonth, thisMonth),
                adminRepository.dailyActiveSecondsForAll(firstDay, today),
                adminRepository.activeOrganizationsPerDay(firstDay, today),
                adminRepository.activeOrganizationsInWindow(firstDay, today),
                adminRepository.monthlyExtractionCounts(firstMonth, thisMonth));
    }
}
