package app.hopps.organization.model;

import app.hopps.member.domain.Member;

/**
 * Payload for adding a person to an existing organization. Deliberately carries only what {@link Member} can hold today
 * — the access level from the design has no backend model yet.
 */
public record NewMemberInput(String firstName, String lastName, String email, String position) {

    /**
     * Converts the input to a Member entity. The Keycloak id stays null here and is filled in by
     * {@code CreateUserInKeycloak#inviteUser} once the account has been provisioned.
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
