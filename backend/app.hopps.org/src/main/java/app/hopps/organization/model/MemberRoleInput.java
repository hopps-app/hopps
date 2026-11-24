package app.hopps.organization.model;

import app.hopps.member.domain.Role;

/**
 * Payload for changing a member's role.
 *
 * @param role
 *            the new role; any assignable role; the owner's needs the permission to manage owners
 */
public record MemberRoleInput(Role role) {
}
