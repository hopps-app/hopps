package app.hopps.organization.model;

import app.hopps.member.domain.Role;

/**
 * Payload for changing a member's role.
 *
 * @param role
 *            the new role; any role except the founder's
 */
public record MemberRoleInput(Role role) {
}
