package app.hopps.org.delegates;

import app.hopps.org.jpa.Member;
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
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

        delegate.createUserInKeycloak(newUser);
        assertThat(usersResource.searchByFirstName("Foo", true), hasSize(1));

        var createdUsers = usersResource.searchByEmail(newUser.getEmail(), true);

        assertEquals(1, createdUsers.size());
        var createdUser = createdUsers.getFirst();
        assertEquals(newUser.getEmail(), createdUser.getEmail());
        assertEquals(newUser.getFirstName(), createdUser.getFirstName());
        assertEquals(newUser.getLastName(), createdUser.getLastName());

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

    private static void removeTestUser(UsersResource usersResource, Member newUser) {
        List<UserRepresentation> testusers = usersResource.searchByEmail(newUser.getEmail(), true);
        for (UserRepresentation user : testusers) {
            Response deleteResponse = usersResource.delete(user.getId());
            deleteResponse.close();
        }
    }
}
