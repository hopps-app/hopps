package app.hopps.member.domain;

import java.util.EnumSet;
import java.util.Set;

import static app.hopps.member.domain.Permission.EDIT_BOOKKEEPING;
import static app.hopps.member.domain.Permission.MANAGE_MEMBERS;
import static app.hopps.member.domain.Permission.MANAGE_ORGANIZATION;
import static app.hopps.member.domain.Permission.VIEW_BOOKKEEPING;

/**
 * A role a member holds in an organization (see {@link MemberOrganization}), as a named set of {@link Permission}s.
 * Kept in hopps's own database rather than at the identity provider: roles apply per organization, which a global IdP
 * role cannot express, and every IdP (Keycloak, Authentik, ...) models roles differently anyway.
 */
public enum Role {

    /**
     * Founder (Gründer:in): founded the organization. Listed explicitly rather than {@code allOf}, so a permission
     * added later (e.g. for the audit) is not granted to the founder by accident.
     */
    OWNER(EnumSet.of(
            VIEW_BOOKKEEPING,
            EDIT_BOOKKEEPING,
            MANAGE_ORGANIZATION,
            MANAGE_MEMBERS)),

    /**
     * Treasurer (Kasse): keeps the books. Everything the founder can do except managing members. Every member invited
     * before roles could be chosen holds this role; the name stays {@code ADMIN} because it is stored in the database.
     */
    ADMIN(EnumSet.of(
            VIEW_BOOKKEEPING,
            EDIT_BOOKKEEPING,
            MANAGE_ORGANIZATION));

    private final EnumSet<Permission> permissions;

    Role(EnumSet<Permission> permissions) {
        this.permissions = permissions;
    }

    public Set<Permission> getPermissions() {
        return permissions.clone();
    }
}
