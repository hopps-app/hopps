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
     * Founder (Gründer:in): founded the organization; may do everything, including the organization details and
     * members.
     */
    OWNER(EnumSet.of(
            VIEW_BOOKKEEPING,
            EDIT_BOOKKEEPING,
            MANAGE_ORGANIZATION,
            MANAGE_MEMBERS)),

    /** Treasurer (Kasse): keeps the books. Default role of invited members. */
    ADMIN(EnumSet.of(
            VIEW_BOOKKEEPING,
            EDIT_BOOKKEEPING)),

    /** Board (Vorstand): keeps an eye on the finances without booking anything. Views everything, changes nothing. */
    BOARD(EnumSet.of(
            VIEW_BOOKKEEPING)),

    /**
     * Auditor (Kassenprüfung): reviews the books independently, so views everything and changes nothing. Reviewing and
     * locking transactions gets its own permission later.
     */
    AUDITOR(EnumSet.of(
            VIEW_BOOKKEEPING));

    private final EnumSet<Permission> permissions;

    Role(EnumSet<Permission> permissions) {
        this.permissions = permissions;
    }

    public Set<Permission> getPermissions() {
        return permissions.clone();
    }

    /**
     * Whether a founder may hand out this role when inviting or changing a member. There is always exactly one founder,
     * so {@link #OWNER} is never assignable.
     */
    public boolean isAssignable() {
        return this != OWNER;
    }
}
