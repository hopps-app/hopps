package app.hopps.organization.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Everything the admin frontend needs to start impersonating a member, returned once the action has been authorised and
 * recorded.
 * <p>
 * The impersonation itself cannot happen server-side: Keycloak's impersonation endpoint answers by setting SSO cookies
 * on the caller, so it has to be called by the administrator's own browser for those cookies to land anywhere useful.
 * This endpoint therefore does the parts the browser must not be trusted with — checking the caller is an admin,
 * checking the member really belongs to the organization, and writing the audit record — and hands back the Keycloak
 * user id for the browser to use.
 */
@Schema(description = "Authorisation to impersonate a member, plus the Keycloak user id to do it with")
public record ImpersonationTicket(
        @Schema(description = "Keycloak user id (sub) of the member to impersonate") String keycloakId,
        @Schema(description = "Display name of the member, for confirmation UI", examples = "Kim Rakete") String displayName,
        @Schema(description = "Email address of the member", examples = "kim.rakete@example.com") String email) {
}
