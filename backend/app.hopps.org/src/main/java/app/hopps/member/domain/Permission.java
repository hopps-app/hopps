package app.hopps.member.domain;

/**
 * Something a member may do in hopps. Code checks permissions, never roles (see {@link Role}), so new roles do not
 * touch any check.
 */
public enum Permission {

    /** Remove members from the organization. */
    MANAGE_MEMBERS
}
