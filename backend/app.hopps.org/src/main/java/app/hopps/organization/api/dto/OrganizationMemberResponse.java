package app.hopps.organization.api.dto;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.MemberStatus;
import app.hopps.member.domain.Role;
import app.hopps.organization.domain.Organization;
import com.fasterxml.jackson.annotation.JsonInclude;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.Comparator;
import java.util.List;

/**
 * Entry of the member list: the member's contact data, invitation status and role in the organization.
 */
@Schema(description = "A member of the current user's organization, with their role in it")
public record OrganizationMemberResponse(
        @Schema(description = "Member id, needed to remove the member or change their role", examples = "15") Long id,
        @Schema(description = "First name", examples = "Kim") String firstName,
        @Schema(description = "Last name", examples = "Rakete") String lastName,
        @Schema(description = "Email address", examples = "kim.rakete@example.com") String email,
        @Schema(description = "Free-text office from older invitations; no longer asked for", examples = "Kassenwart") String position,
        @Schema(description = "Whether the member can log in, and how far their invitation got", examples = "INVITED") MemberStatus status,
        @Schema(description = "The member's role in the organization", examples = "ADMIN") Role role,
        @JsonInclude(JsonInclude.Include.NON_NULL) @Schema(description = "One-time link in which the invited person sets their password, to be passed on by the "
                + "inviting admin. Only present right after adding a member whose invitation email could not be sent.") String setupLink) {

    /** Order of the roles in the member list: founder, board, treasurer, auditor. */
    private static final List<Role> ROLE_ORDER = List.of(Role.OWNER, Role.BOARD, Role.ADMIN, Role.AUDITOR);

    /** Order of the member list: by {@link #ROLE_ORDER}, then by last and first name. */
    public static final Comparator<OrganizationMemberResponse> BY_ROLE_THEN_NAME = Comparator
            .comparing(OrganizationMemberResponse::role,
                    Comparator.nullsLast(Comparator.comparingInt(ROLE_ORDER::indexOf)))
            .thenComparing(OrganizationMemberResponse::lastName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
            .thenComparing(OrganizationMemberResponse::firstName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));

    public static OrganizationMemberResponse of(Member member, Organization organization) {
        return new OrganizationMemberResponse(
                member.id,
                member.getFirstName(),
                member.getLastName(),
                member.getEmail(),
                member.getPosition(),
                member.getStatus(),
                member.getRole(organization).orElse(null),
                member.getSetupLink());
    }
}
