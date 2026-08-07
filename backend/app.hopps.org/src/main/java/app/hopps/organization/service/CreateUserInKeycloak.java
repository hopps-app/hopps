package app.hopps.organization.service;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.MemberStatus;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@ApplicationScoped
public class CreateUserInKeycloak {

    private static final Logger LOG = LoggerFactory.getLogger(CreateUserInKeycloak.class);

    private static final String UPDATE_PASSWORD_ACTION = "UPDATE_PASSWORD";
    private static final String VERIFY_EMAIL_ACTION = "VERIFY_EMAIL";

    @Inject
    Keycloak keycloak;

    @ConfigProperty(name = "app.hopps.org.auth.realm-name")
    String realmName;

    @ConfigProperty(name = "app.hopps.org.auth.default-role")
    String ownerRoleName;

    @ConfigProperty(name = "app.hopps.org.auth.invitation.client-id")
    String invitationClientId;

    @ConfigProperty(name = "app.hopps.org.auth.invitation.redirect-uri")
    String invitationRedirectUri;

    @ConfigProperty(name = "app.hopps.org.auth.invitation.lifespan-seconds")
    int invitationLifespanSeconds;

    public void createUserInKeycloak(Member user, String newPassword) {

        if (newPassword == null || newPassword.isEmpty()) {
            throw new IllegalArgumentException("New password cannot be null or empty");
        }

        RealmResource realmResource = keycloak.realm(realmName);
        UsersResource usersResource = realmResource.users();
        RoleRepresentation ownerRole = ensureRealmRole(realmResource, ownerRoleName);

        UserRepresentation userRepresentation = getUserRepresentation(user, newPassword);
        Response response = usersResource.create(userRepresentation);

        if (response.getStatusInfo().getFamily() != Response.Status.Family.SUCCESSFUL) {
            String body = response.readEntity(String.class);
            throw new WebApplicationException("Could not create user, body: " + body, response);
        }

        response.close();

        // Assign a user to the owner role
        UserRepresentation createdUser = usersResource.search(userRepresentation.getUsername())
                .getFirst();

        // Persist the stable Keycloak user id (sub) on the member so it can be linked by id, not by the mutable email.
        user.setKeycloakId(createdUser.getId());
        // The founder picked their password in the registration form, so the account is usable immediately.
        user.setStatus(MemberStatus.ACTIVE);

        usersResource.get(createdUser.getId())
                .roles()
                .realmLevel()
                .add(List.of(ownerRole));
    }

    /**
     * Provisions an invited user: creates a Keycloak account <em>without</em> credentials, assigns the given realm role
     * and asks Keycloak to send the invitation email in which the person sets their own password. No password is ever
     * chosen by, or passed through, hopps.
     * <p>
     * Sets {@code keycloakId} and {@code status} on the given member as a side effect, exactly like
     * {@link #createUserInKeycloak(Member, String)} does for the founder. The status says whether the invitation email
     * went out: {@link MemberStatus#INVITED} if it did, {@link MemberStatus#INVITATION_FAILED} if it did not.
     *
     * @param user
     *            the member to provision; its email becomes the Keycloak username
     * @param roleName
     *            the realm role to assign, created on the fly if the realm does not have it yet
     *
     * @return whether this call created the account. False when an account for that email already existed and was
     *         linked instead — only an account we created ourselves may be removed again if persisting fails.
     */
    public boolean inviteUser(Member user, String roleName) {
        RealmResource realmResource = keycloak.realm(realmName);
        UsersResource usersResource = realmResource.users();
        RoleRepresentation role = ensureRealmRole(realmResource, roleName);

        UserRepresentation userRepresentation = getInvitedUserRepresentation(user);
        Response response = usersResource.create(userRepresentation);
        int status = response.getStatus();

        // An account for this email can already exist — the person was invited to another organization before, or
        // logged in through a brokered identity provider. Link that account instead of failing the invitation.
        boolean userCreated = status != Response.Status.CONFLICT.getStatusCode();
        if (userCreated && response.getStatusInfo().getFamily() != Response.Status.Family.SUCCESSFUL) {
            String body = response.readEntity(String.class);
            throw new WebApplicationException("Could not create user, body: " + body, response);
        }
        response.close();

        String userId = findUserIdByEmail(usersResource, user.getEmail());
        if (!userCreated) {
            LOG.info("Keycloak account for {} already existed, linking it instead of creating a new one",
                    user.getEmail());
        }

        // Persist the stable Keycloak user id (sub) on the member so it can be linked by id, not by the mutable email.
        user.setKeycloakId(userId);

        usersResource.get(userId)
                .roles()
                .realmLevel()
                .add(List.of(role));

        boolean invitationSent = sendInvitationEmail(usersResource, userId, user.getEmail());
        user.setStatus(invitationSent ? MemberStatus.INVITED : MemberStatus.INVITATION_FAILED);

        return userCreated;
    }

    /**
     * Deletes a Keycloak user again. Used to undo an invitation when persisting the member afterwards fails, so a
     * failed request does not leave a stray account behind. Failures are logged, not thrown: the caller is already
     * handling an error and the original one is the interesting one.
     */
    public void deleteUser(String keycloakId) {
        try (Response response = keycloak.realm(realmName).users().delete(keycloakId)) {
            if (response.getStatusInfo().getFamily() != Response.Status.Family.SUCCESSFUL) {
                LOG.warn("Could not remove Keycloak user {} after a failed invitation, status {}", keycloakId,
                        response.getStatus());
            }
        } catch (Exception e) {
            LOG.warn("Could not remove Keycloak user {} after a failed invitation", keycloakId, e);
        }
    }

    /**
     * Asks Keycloak to email the invitation link. Returns false instead of throwing when that fails — most commonly
     * because the realm has no SMTP server configured. The account is already usable at this point, and letting the
     * whole request fail here would leave the member unpersisted while the Keycloak user exists.
     */
    private boolean sendInvitationEmail(UsersResource usersResource, String userId, String email) {
        try {
            usersResource.get(userId)
                    .executeActionsEmail(invitationClientId, invitationRedirectUri, invitationLifespanSeconds,
                            List.of(UPDATE_PASSWORD_ACTION, VERIFY_EMAIL_ACTION));
            return true;
        } catch (Exception e) {
            LOG.warn("Could not send the invitation email to {} — is an SMTP server configured for realm {}?", email,
                    realmName, e);
            return false;
        }
    }

    private static String findUserIdByEmail(UsersResource usersResource, String email) {
        return usersResource.searchByEmail(email, true)
                .stream()
                .findFirst()
                .map(UserRepresentation::getId)
                .orElseThrow(() -> new WebApplicationException(
                        "Keycloak user for " + email + " could not be found right after creating it",
                        Response.Status.INTERNAL_SERVER_ERROR));
    }

    private static UserRepresentation getUserRepresentation(Member user, String newPassword) {
        UserRepresentation userRepresentation = getUserRepresentation(user);

        CredentialRepresentation credential = new CredentialRepresentation();
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(newPassword);
        credential.setTemporary(false);
        userRepresentation.setCredentials(List.of(credential));
        return userRepresentation;
    }

    /** The fields both flows share. Credentials and required actions are added by the caller that needs them. */
    private static UserRepresentation getUserRepresentation(Member user) {
        UserRepresentation userRepresentation = new UserRepresentation();
        userRepresentation.setEnabled(true);
        userRepresentation.setFirstName(user.getFirstName());
        userRepresentation.setLastName(user.getLastName());
        userRepresentation.setEmail(user.getEmail());
        userRepresentation.setUsername(user.getEmail());
        return userRepresentation;
    }

    /**
     * The account of an invited user: no credentials, and a standing requirement to pick a password. Email verification
     * is only requested through the invitation link, not as a required action — an unverified account in a realm that
     * cannot send email would otherwise be stuck at login with no way forward.
     */
    private static UserRepresentation getInvitedUserRepresentation(Member user) {
        UserRepresentation userRepresentation = getUserRepresentation(user);
        userRepresentation.setEmailVerified(false);
        userRepresentation.setRequiredActions(List.of(UPDATE_PASSWORD_ACTION));
        return userRepresentation;
    }

    private RoleRepresentation ensureRealmRole(RealmResource realmResource, String ownerRoleName) {
        RoleRepresentation ownerRole;
        try {
            ownerRole = realmResource.roles().get(ownerRoleName).toRepresentation();
        } catch (Exception e) {
            ownerRole = new RoleRepresentation();
            ownerRole.setName(ownerRoleName);
            try {
                realmResource.roles().create(ownerRole);
            } catch (Exception roleException) {
                LOG.warn("Could not create owner role: {}", ownerRoleName, roleException);
            }

            ownerRole = realmResource.roles().get(ownerRoleName).toRepresentation();
        }
        return ownerRole;
    }
}
