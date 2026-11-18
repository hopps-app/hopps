package app.hopps.organization.model;

/**
 * Corrected details of a member. A field left out keeps its current value.
 *
 * @param email
 *            only changeable while the invitation is pending; the invitation is then sent to the new address
 */
public record MemberUpdateInput(String firstName, String lastName, String email) {
}
