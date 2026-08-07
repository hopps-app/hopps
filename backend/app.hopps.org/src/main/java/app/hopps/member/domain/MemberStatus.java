package app.hopps.member.domain;

/**
 * Whether and how a member can log into hopps.
 * <p>
 * Note that {@link #INVITED} does not flip to {@link #ACTIVE} once the person actually sets their password — hopps
 * would have to ask Keycloak, and there is no login hook to do it on. Both states mean "has an account", they differ
 * only in whether we know the person has used it.
 */
public enum MemberStatus {

    /** No Keycloak account. The person is listed in the organization but cannot log in. */
    NO_ACCESS,

    /** Account provisioned and the invitation email sent; the person still has to pick a password. */
    INVITED,

    /**
     * Account provisioned, but the invitation email could not be sent — most likely because the realm has no SMTP
     * server configured. The invitation has to be passed on by other means.
     */
    INVITATION_FAILED,

    /** Has an account and can log in right away, like the founder who chose a password while registering. */
    ACTIVE
}
