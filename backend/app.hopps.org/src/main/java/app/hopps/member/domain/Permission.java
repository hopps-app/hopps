package app.hopps.member.domain;

/**
 * Something a member may do in hopps. Code checks permissions, never roles (see {@link Role}), so new roles do not
 * touch any check.
 * <p>
 * Endpoints require a permission with {@code @PermissionsAllowed(Permission.Names.XYZ)}; annotations need compile-time
 * strings, hence the {@link Names} constants next to the enum.
 */
public enum Permission {

    /** See transactions, receipts, accounts, bank imports, categories, bommels and reports. */
    VIEW_BOOKKEEPING,

    /** Create, change, confirm and delete anything in the bookkeeping. */
    EDIT_BOOKKEEPING,

    /** Change the organization's details, such as name, address and logo. */
    MANAGE_ORGANIZATION,

    /** Add or remove members of the organization. */
    MANAGE_MEMBERS;

    /** The permission names as constants, for use in {@code @PermissionsAllowed}. Each equals its enum's name. */
    public static final class Names {
        public static final String VIEW_BOOKKEEPING = "VIEW_BOOKKEEPING";
        public static final String EDIT_BOOKKEEPING = "EDIT_BOOKKEEPING";
        public static final String MANAGE_ORGANIZATION = "MANAGE_ORGANIZATION";
        public static final String MANAGE_MEMBERS = "MANAGE_MEMBERS";

        private Names() {
        }
    }
}
