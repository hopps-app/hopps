package app.hopps.member.api;

import app.hopps.member.repository.MemberActivityRepository;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Presence signal from the frontend, feeding the time-in-app metric behind the admin activity chart.
 * <p>
 * This exists because ordinary API traffic cannot measure attention in a single-page application: entering data into a
 * form or reading a document produces no backend calls at all, so a member who spends forty minutes filling in a Beleg
 * is indistinguishable from one who left. The heartbeat closes that gap — the client is the only party that knows the
 * tab is in the foreground and the member is still interacting.
 */
@Path("/member/activity")
@Authenticated
public class MemberActivityResource {

    @Inject
    MemberActivityRepository activityRepository;

    @Inject
    JsonWebToken jwt;

    /**
     * Records that the caller is present right now. Carries no payload deliberately: the server needs only who and
     * when, and the accumulator derives elapsed time from the gap to the previous signal.
     * <p>
     * Note that {@code LastSeenFilter} also fires on this request and accumulates as well. That is harmless rather than
     * double-counted — both go through the same statement, whose minimum-interval guard drops the second one, and the
     * accumulator adds elapsed time rather than a fixed amount per call.
     */
    @POST
    @Path("/heartbeat")
    @Operation(summary = "Report that the member is currently using the application", description = "Records a presence signal for the authenticated member. The elapsed time since that member's previous signal is added to today's in-app total, provided the gap is short enough to count as continuous presence; a longer gap is treated as the member having been away and adds nothing. Carries no request body. Callers should send this only while the application is actually in the foreground and the member has recently interacted with it, and may send it as often as they like — repeated calls add only the real time between them.")
    @APIResponse(responseCode = "204", description = "Presence recorded")
    @APIResponse(responseCode = "401", description = "User not logged in")
    public Response heartbeat() {
        String keycloakId = jwt.getSubject();
        if (keycloakId != null) {
            activityRepository.accumulate(keycloakId, LocalDate.now(), Instant.now());
        }
        return Response.noContent().build();
    }
}
