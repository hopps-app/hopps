package app.hopps.organization.service;

import app.hopps.member.domain.Member;

/**
 * Provisions member accounts with whichever identity provider the deployment is configured to use.
 * {@link KeycloakIdentityProvisioningService} is the only implementation today; a self-hosted deployment that wants a
 * different provider (e.g. Authentik) is meant to add its own implementation of this interface rather than change the
 * callers.
 */
public interface IdentityProvisioningService {

    /**
     * Creates the account for an organization's founder, who picked their own password during registration. Sets the
     * identity provider's user id and {@link app.hopps.member.domain.MemberStatus#ACTIVE} on the given member.
     *
     * @param owner
     *            the founder to provision; its email becomes the username
     * @param newPassword
     *            the password the founder chose
     */
    void createOwner(Member owner, String newPassword);

    /**
     * Provisions an invited user: creates an account without credentials, assigns the given role and asks the identity
     * provider to send an invitation the person uses to set their own password. Sets the identity provider's user id
     * and status on the given member.
     *
     * @param member
     *            the member to provision; its email becomes the username
     * @param roleName
     *            the role to assign, created on the fly if the provider doesn't have it yet
     *
     * @return whether this call created the account. False when an account for that email already existed and was
     *         linked instead — only an account created by this call may be removed again if persisting fails.
     */
    boolean inviteMember(Member member, String roleName);

    /**
     * Deletes a previously provisioned user again. Used to undo an invitation when persisting the member afterwards
     * fails, so a failed request does not leave a stray account behind.
     *
     * @param identityId
     *            the identity provider's user id, as set on the member by {@link #createOwner} or {@link #inviteMember}
     */
    void deleteUser(String identityId);
}
