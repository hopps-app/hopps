package app.hopps.organization.model;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.Role;

/**
 * Payload for adding a person to an existing organization.
 *
 * @param role
 *            the role the person gets; {@link Role#ADMIN} (Treasurer) if left out. The founder role cannot be given.
 * @param position
 *            optional free-text office, no longer asked for by the app but still accepted from older clients
 */
public record NewMemberInput(String firstName, String lastName, String email, String position, Role role) {

    /** The role the person gets, {@link Role#ADMIN} (Treasurer) if the client did not choose one. */
    public Role roleOrDefault() {
        return role != null ? role : Role.ADMIN;
    }

    /**
     * Converts the input to a Member entity. The Keycloak id stays null here and is filled in by
     * {@code IdentityProvisioningService#inviteMember} once the account has been provisioned.
     *
     * @return a new Member entity populated with the input data
     */
    public Member toMember() {
        Member member = new Member();
        member.setFirstName(trimToNull(firstName));
        member.setLastName(trimToNull(lastName));
        member.setEmail(trimToNull(email));
        member.setPosition(trimToNull(position));
        return member;
    }

    /** Empty form fields arrive as "", which would otherwise be stored as a blank position. */
    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
