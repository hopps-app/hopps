package app.hopps.member.domain;

import java.util.EnumSet;
import java.util.Set;

import static app.hopps.member.domain.Permission.EDIT_BOOKKEEPING;
import static app.hopps.member.domain.Permission.MANAGE_CATEGORIES;
import static app.hopps.member.domain.Permission.MANAGE_MEMBERS;
import static app.hopps.member.domain.Permission.MANAGE_ORGANIZATION;
import static app.hopps.member.domain.Permission.MANAGE_OWNERS;
import static app.hopps.member.domain.Permission.MANAGE_ROLES;
import static app.hopps.member.domain.Permission.VIEW_BOOKKEEPING;

/**
 * A role a member holds in an organization (see {@link MemberOrganization}), as a named set of {@link Permission}s.
 * Kept in hopps's own database rather than at the identity provider: roles apply per organization, which a global IdP
 * role cannot express, and every IdP (Keycloak, Authentik, ...) models roles differently anyway.
 */
public enum Role {

    /**
     * Owner (Besitzer): may do everything, including the organization details, categories, members and appointing
     * further owners. An organization has one or more of them, and always keeps at least one.
     */
    OWNER(EnumSet.of(
            VIEW_BOOKKEEPING,
            EDIT_BOOKKEEPING,
            MANAGE_ORGANIZATION,
            MANAGE_MEMBERS,
            MANAGE_ROLES,
            MANAGE_CATEGORIES,
            MANAGE_OWNERS)),

    /**
     * Board (Vorstand): keeps the books and manages the members and their roles, but never the owner, the organization
     * details or the categories.
     */
    ADMIN(EnumSet.of(
            VIEW_BOOKKEEPING,
            EDIT_BOOKKEEPING,
            MANAGE_MEMBERS,
            MANAGE_ROLES)),

    /** Treasurer (Kassier:in): keeps the books. Default role of invited members. */
    TREASURER(EnumSet.of(
            VIEW_BOOKKEEPING,
            EDIT_BOOKKEEPING)),

    /** Reader (Leser): views everything, changes nothing. */
    VIEWER(EnumSet.of(
            VIEW_BOOKKEEPING)),

    /**
     * Auditor (Kassenprüfung): views everything, changes nothing. Hidden for now: it cannot be handed out until
     * reviewing and locking transactions exists, but members that already hold it keep it.
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
     * Whether this role may be handed out when inviting or changing a member. {@link #AUDITOR} is hidden. Handing out
     * {@link #OWNER} additionally needs {@link Permission#MANAGE_OWNERS}, see {@link #isOwnerRole()}.
     */
    public boolean isAssignable() {
        return this != AUDITOR;
    }

    /** Whether this role is the owner's, whose assignment, change and removal need {@link Permission#MANAGE_OWNERS}. */
    public boolean isOwnerRole() {
        return this == OWNER;
    }
}
