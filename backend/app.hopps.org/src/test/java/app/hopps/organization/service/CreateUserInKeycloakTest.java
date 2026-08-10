package app.hopps.organization.service;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.MemberStatus;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.junit.jupiter.api.Test;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;

import java.util.List;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.collection.IsCollectionWithSize.hasSize;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class CreateUserInKeycloakTest {

    // Caveat: Keycloak Dev Container will be reused and keep its state

    @Inject
    CreateUserInKeycloak delegate;

    @Inject
    Keycloak keycloak;

    @Inject
    @ConfigProperty(name = "app.hopps.org.auth.default-role")
    String defaultRole;

    @Inject
    @ConfigProperty(name = "app.hopps.org.auth.realm-name")
    String realmName;

    @Inject
    @ConfigProperty(name = "app.hopps.org.auth.member-role")
    String memberRole;

    @Test
    void createUserInKeycloak() {
        UsersResource usersResource = keycloak.realm(realmName).users();

        Member newUser = new Member();
        newUser.setFirstName("Foo");
        newUser.setLastName("Bar");
        newUser.setEmail("foo@bar.com");

        removeTestUser(usersResource, newUser);

        // Quarkus creates "alice" and "bob" users for us while testing
        assertThat(usersResource.searchByFirstName("Foo", true), hasSize(0));

        delegate.createUserInKeycloak(newUser, "testPassword");
        assertThat(usersResource.searchByFirstName("Foo", true), hasSize(1));

        var createdUsers = usersResource.searchByEmail(newUser.getEmail(), true);

        assertEquals(1, createdUsers.size());
        var createdUser = createdUsers.getFirst();
        assertEquals(newUser.getEmail(), createdUser.getEmail());
        assertEquals(newUser.getFirstName(), createdUser.getFirstName());
        assertEquals(newUser.getLastName(), createdUser.getLastName());

        // The stable Keycloak id must be captured on the member for id-based linking
        assertEquals(createdUser.getId(), newUser.getKeycloakId());

        // Assert that user got the default role
        var realmRoles = usersResource.get(createdUser.getId())
                .roles()
                .realmLevel()
                .listAll()
                .stream()
                .map(RoleRepresentation::getName)
                .toList();

        assertTrue(realmRoles.contains(defaultRole));

        removeTestUser(usersResource, newUser);
    }

    @Test
    void createUserInKeycloakMarksTheFounderActive() {
        Member founder = new Member();
        founder.setFirstName("Active");
        founder.setLastName("Founder");
        founder.setEmail("active.founder@bar.com");

        UsersResource usersResource = keycloak.realm(realmName).users();
        removeTestUser(usersResource, founder);

        delegate.createUserInKeycloak(founder, "testPassword");

        // They picked a password during registration, so they can log in right away.
        assertEquals(MemberStatus.ACTIVE, founder.getStatus());

        removeTestUser(usersResource, founder);
    }

    @Test
    void inviteUserCreatesAnAccountWithoutCredentials() {
        UsersResource usersResource = keycloak.realm(realmName).users();

        Member invited = new Member();
        invited.setFirstName("Invited");
        invited.setLastName("Person");
        invited.setEmail("invited.person@bar.com");

        removeTestUser(usersResource, invited);

        boolean userCreated = delegate.inviteUser(invited, memberRole);

        assertTrue(userCreated);
        var createdUsers = usersResource.searchByEmail(invited.getEmail(), true);
        assertEquals(1, createdUsers.size());
        var createdUser = createdUsers.getFirst();
        assertEquals(createdUser.getId(), invited.getKeycloakId());

        // No password was set for them; they have to go through the invitation to pick one.
        assertTrue(createdUser.getRequiredActions().contains("UPDATE_PASSWORD"));
        assertEquals(0, usersResource.get(createdUser.getId()).credentials().size());

        var realmRoles = usersResource.get(createdUser.getId())
                .roles()
                .realmLevel()
                .listAll()
                .stream()
                .map(RoleRepresentation::getName)
                .toList();
        assertTrue(realmRoles.contains(memberRole));

        // The test realm has no reachable SMTP server, so the invitation cannot go out. That must not fail the
        // invitation itself — the account exists and the status says the mail did not arrive.
        assertEquals(MemberStatus.INVITATION_FAILED, invited.getStatus());

        removeTestUser(usersResource, invited);
    }

    @Test
    void inviteUserLinksAnExistingAccountInsteadOfFailing() {
        UsersResource usersResource = keycloak.realm(realmName).users();

        Member existing = new Member();
        existing.setFirstName("Already");
        existing.setLastName("There");
        existing.setEmail("already.there@bar.com");

        removeTestUser(usersResource, existing);

        delegate.inviteUser(existing, memberRole);
        String firstKeycloakId = existing.getKeycloakId();

        // A second invitation for the same email — e.g. the person was invited to another organization before.
        Member sameEmail = new Member();
        sameEmail.setFirstName("Already");
        sameEmail.setLastName("There");
        sameEmail.setEmail("already.there@bar.com");

        boolean userCreated = delegate.inviteUser(sameEmail, memberRole);

        assertFalse(userCreated);
        assertEquals(firstKeycloakId, sameEmail.getKeycloakId());
        assertThat(usersResource.searchByEmail(sameEmail.getEmail(), true), hasSize(1));

        removeTestUser(usersResource, existing);
    }

    @Test
    void deleteUserRemovesTheAccountAgain() {
        UsersResource usersResource = keycloak.realm(realmName).users();

        Member throwaway = new Member();
        throwaway.setFirstName("Throw");
        throwaway.setLastName("Away");
        throwaway.setEmail("throw.away@bar.com");

        removeTestUser(usersResource, throwaway);
        delegate.inviteUser(throwaway, memberRole);
        assertThat(usersResource.searchByEmail(throwaway.getEmail(), true), hasSize(1));

        delegate.deleteUser(throwaway.getKeycloakId());

        assertThat(usersResource.searchByEmail(throwaway.getEmail(), true), hasSize(0));
    }

    @Test
    void shouldSetPassword() {
        // given
        String newPassword = "newPassword";
        Member kevin = new Member();
        kevin.setFirstName("Kevin");
        kevin.setLastName("Cewyn");
        kevin.setEmail("kevin@example.com");

        // when
        assertDoesNotThrow(() -> delegate.createUserInKeycloak(kevin, newPassword));
    }

    private static void removeTestUser(UsersResource usersResource, Member newUser) {
        List<UserRepresentation> testusers = usersResource.searchByEmail(newUser.getEmail(), true);
        for (UserRepresentation user : testusers) {
            Response deleteResponse = usersResource.delete(user.getId());
            deleteResponse.close();
        }
    }
}
