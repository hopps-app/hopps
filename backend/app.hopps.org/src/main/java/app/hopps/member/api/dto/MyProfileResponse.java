package app.hopps.member.api.dto;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.Permission;
import app.hopps.member.domain.Role;
import app.hopps.organization.domain.Organization;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.Set;

/**
 * The current user's profile: their details, their organization, and their role and permissions in it.
 */
@Schema(description = "The current user's profile in their organization")
public record MyProfileResponse(
        @Schema(description = "Member id", examples = "21") Long id,
        @Schema(description = "First name", examples = "Alice") String firstName,
        @Schema(description = "Last name", examples = "Musterfrau") String lastName,
        @Schema(description = "Email address, managed by the sign-in service", examples = "alice@example.test") String email,
        @Schema(description = "Phone number, optional", examples = "+49 170 1234567") String phoneNumber,
        @Schema(description = "Name of the organization", examples = "Theatervereine Bühnefrei e.V.") String organizationName,
        @Schema(description = "Role in the organization", examples = "OWNER") Role role,
        @Schema(description = "What the role allows") Set<Permission> permissions) {

    public static MyProfileResponse of(Member member, Organization organization, Set<Permission> permissions) {
        return new MyProfileResponse(
                member.id,
                member.getFirstName(),
                member.getLastName(),
                member.getEmail(),
                member.getPhoneNumber(),
                organization.getName(),
                member.getRole(organization).orElse(null),
                permissions);
    }
}
