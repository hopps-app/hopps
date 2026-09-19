package app.hopps.member.domain;

import java.util.EnumSet;
import java.util.Set;

/**
 * A role a member holds on a bommel (see {@link MemberRole}), as a named set of {@link Permission}s. Kept in hopps's
 * own database rather than at the identity provider: roles apply to one organization or even one bommel, which a global
 * IdP role cannot express, and every IdP (Keycloak, Authentik, ...) models roles differently anyway.
 */
public enum Role {

    /** Founded the organization. */
    OWNER(EnumSet.of(Permission.MANAGE_MEMBERS)),

    /** Invited into the organization. */
    ADMIN(EnumSet.noneOf(Permission.class));

    private final EnumSet<Permission> permissions;

    Role(EnumSet<Permission> permissions) {
        this.permissions = permissions;
    }

    public Set<Permission> getPermissions() {
        return permissions.clone();
    }
}
