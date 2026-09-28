package app.hopps.member.domain;

/**
 * Something a member may do in hopps. Code checks permissions, never roles (see {@link Role}), so new roles do not
 * touch any check.
 */
public enum Permission {

    /** Add or remove members of the organization. */
    MANAGE_MEMBERS
}
