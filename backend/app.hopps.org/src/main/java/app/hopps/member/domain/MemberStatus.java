package app.hopps.member.domain;

/**
 * Whether and how a member can log into hopps.
 * <p>
 * Keycloak never tells hopps that an invitation was completed, so the states that mean "has an account" differ only in
 * whether we have seen the person use it: {@link #INVITED} and {@link #INVITATION_FAILED} flip to {@link #ACTIVE} on
 * the first request that arrives with their token, which is proof enough that they got in. See
 * {@code SecurityUtils#recordAuthentication}.
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

    /**
     * Has logged in: either the founder, who chose a password while registering, or an invited person who has since
     * shown up with a valid token.
     */
    ACTIVE
}
