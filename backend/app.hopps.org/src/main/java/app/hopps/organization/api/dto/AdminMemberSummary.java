package app.hopps.organization.api.dto;

import app.hopps.member.domain.Member;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Minimal member projection for the admin organization detail view.
 */
@Schema(description = "A member of an organization, as shown on the admin detail page")
public record AdminMemberSummary(
        @Schema(description = "Member id, needed to address this member in admin actions", examples = "15") Long id,
        @Schema(description = "First name", examples = "Kim") String firstName,
        @Schema(description = "Last name", examples = "Rakete") String lastName,
        @Schema(description = "Email address", examples = "kim.rakete@example.com") String email,
        @Schema(description = "Whether this member has a Keycloak account and can therefore be impersonated") boolean hasAccount) {

    public static AdminMemberSummary from(Member member) {
        return new AdminMemberSummary(
                member.id,
                member.getFirstName(),
                member.getLastName(),
                member.getEmail(),
                member.getKeycloakId() != null);
    }
}
