package app.hopps.organization.service.authentik;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.MemberStatus;
import app.hopps.organization.service.IdentityProvisioningService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Typed;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;

/**
 * Provisions member accounts in a partner's Authentik instead of hopps's own Keycloak. Used when
 * {@code app.hopps.org.auth.provider=authentik}, see
 * {@link app.hopps.organization.service.IdentityProvisioningServiceProducer}.
 * <p>
 * The partner owns the accounts: it creates them for its people, who log in to hopps with them directly. hopps
 * therefore never registers founders ({@link #createOwner} is not supported) and assigns no roles or groups in
 * Authentik; the only roles hopps checks ({@code admin}) matter on its own hosted deployment alone. What remains is
 * inviting a person into an organization, which links their existing account or creates one if they have none yet.
 * <p>
 * <b>Subject mode:</b> the {@code uuid} this service captures from Authentik is persisted as
 * {@link Member#getKeycloakId()} and must equal the OIDC {@code sub} claim a login later presents. That only holds if
 * the Authentik OAuth2/OIDC Provider used for login has its "Subject mode" set to "Based on the User's UUID". The
 * default ("hashed user ID") does not match and would leave every invited member unable to log in
 * ({@code SecurityUtils} would 404 looking them up).
 */
@Typed(AuthentikIdentityProvisioningService.class)
@ApplicationScoped
public class AuthentikIdentityProvisioningService implements IdentityProvisioningService {

    private static final Logger LOG = LoggerFactory.getLogger(AuthentikIdentityProvisioningService.class);

    @Inject
    @RestClient
    AuthentikApi api;

    @ConfigProperty(name = "app.hopps.org.auth.authentik.email-stage-id")
    Optional<String> recoveryEmailStageId;

    // Same validity as Keycloak's invitation link.
    @ConfigProperty(name = "app.hopps.org.auth.invitation.lifespan-seconds")
    long invitationLifespanSeconds;

    @Override
    public void createOwner(Member user, String newPassword) {
        throw new UnsupportedOperationException("Registration is disabled: accounts are managed in Authentik");
    }

    /**
     * Gives a person access to hopps through their Authentik account. An existing account (the usual case, the partner
     * has already created one) is linked as is: the person keeps logging in the way they already do and gets no email.
     * Otherwise an account without credentials is created and Authentik sends a recovery email in which the person sets
     * their own password. Without a mail server (no email stage configured, or sending failed) the same set-password
     * link goes to the inviting admin instead, as {@link Member#getSetupLink()}, to pass on. No password is ever chosen
     * by, or passed through, hopps.
     * <p>
     * Sets {@code keycloakId}, {@code status} and possibly {@code setupLink} on the given member as a side effect. The
     * status stays {@link MemberStatus#INVITED} until the first login, or is {@link MemberStatus#INVITATION_FAILED} if
     * a new account's email could not be sent.
     *
     * @param user
     *            the member to provision; its email becomes the Authentik username of a new account
     * @param roleName
     *            ignored: hopps does not assign roles in the partner's Authentik
     *
     * @return whether this call created the account. False when an account for that email already existed and was
     *         linked instead; only an account we created ourselves may be removed again if persisting fails.
     */
    @Override
    public boolean inviteMember(Member user, String roleName) {
        AuthentikUser existing = findByEmail(user.getEmail());
        if (existing != null) {
            LOG.info("Authentik account for {} already exists, linking it", user.getEmail());
            // Persist the stable Authentik user id (uuid) so the member is linked by id, not by the mutable email.
            user.setKeycloakId(existing.uuid());
            user.setStatus(MemberStatus.INVITED);
            return false;
        }

        AuthentikUser created = api.createUser(toUserRequest(user));
        user.setKeycloakId(created.uuid());
        if (sendInvitationEmail(created.pk(), user.getEmail())) {
            user.setStatus(MemberStatus.INVITED);
        } else {
            // Only ever for an account created right here: a link for an existing account would let the inviting admin
            // take it over.
            user.setStatus(MemberStatus.INVITATION_FAILED);
            user.setSetupLink(createSetupLink(created.pk(), user.getEmail()));
        }
        return true;
    }

    /**
     * Deletes an Authentik user again. Used to undo an invitation when persisting the member afterwards fails, so a
     * failed request does not leave a stray account behind. Failures are logged, not thrown: the caller is already
     * handling an error and the original one is the interesting one.
     */
    @Override
    public void deleteUser(String identityId) {
        try {
            AuthentikUser found = findByUuid(identityId);
            if (found == null) {
                LOG.warn("Could not remove Authentik user {} after a failed invitation: no longer found", identityId);
                return;
            }
            api.deleteUser(found.pk());
        } catch (Exception e) {
            LOG.warn("Could not remove Authentik user {} after a failed invitation", identityId, e);
        }
    }

    /**
     * Asks Authentik to email the recovery link. Returns false instead of throwing when that fails, most commonly
     * because the email stage id is missing or wrong, or its flow has no working email backend. The account exists at
     * this point, and failing the whole request would leave the member unpersisted while the Authentik user exists.
     */
    private boolean sendInvitationEmail(long userId, String email) {
        if (recoveryEmailStageId.isEmpty()) {
            LOG.info("No email stage configured (app.hopps.org.auth.authentik.email-stage-id), not emailing {}", email);
            return false;
        }
        try {
            String stageId = recoveryEmailStageId.get();
            api.sendRecoveryEmail(userId, stageId, new AuthentikRecoveryRequest(stageId, tokenDuration()));
            return true;
        } catch (Exception e) {
            LOG.warn("Could not send the invitation email to {}. Is app.hopps.org.auth.authentik.email-stage-id a "
                    + "working email stage?", email, e);
            return false;
        }
    }

    /**
     * Asks Authentik for the set-password link without mailing it. Returns null instead of throwing when that fails,
     * most commonly because the Authentik brand has no recovery flow; an admin then has to set a password in Authentik.
     * The link itself is never logged: it is a credential for the new account.
     */
    private String createSetupLink(long userId, String email) {
        try {
            return api.createRecoveryLink(userId, new AuthentikRecoveryRequest(null, tokenDuration())).link();
        } catch (Exception e) {
            LOG.warn("Could not create a set-password link for {}. Does the Authentik brand have a recovery flow, "
                    + "with Authentication set to 'No requirement'?", email, e);
            return null;
        }
    }

    private String tokenDuration() {
        return "seconds=" + invitationLifespanSeconds;
    }

    private AuthentikUser findByEmail(String email) {
        List<AuthentikUser> found = api.findUsersByEmail(email).results();
        return found.isEmpty() ? null : found.getFirst();
    }

    private AuthentikUser findByUuid(String uuid) {
        List<AuthentikUser> found = api.findUsersByUuid(uuid).results();
        return found.isEmpty() ? null : found.getFirst();
    }

    private static AuthentikUserRequest toUserRequest(Member user) {
        String name = (user.getFirstName() + " " + user.getLastName()).trim();
        return new AuthentikUserRequest(user.getEmail(), name, user.getEmail(), true);
    }
}
