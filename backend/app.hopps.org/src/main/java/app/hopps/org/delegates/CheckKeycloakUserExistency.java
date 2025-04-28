package app.hopps.org.delegates;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.kie.kogito.internal.process.runtime.KogitoProcessContext;

import java.util.List;

@ApplicationScoped
public class CheckKeycloakUserExistency {

    @Inject
    Keycloak keycloak;

    @ConfigProperty(name = "app.hopps.org.auth.realm-name")
    String realmName;

    @ConfigProperty(name = "app.hopps.org.auth.default-role")
    String ownerRoleName;

    public boolean checkUserExistence(String email, KogitoProcessContext context) throws Exception {
        RealmResource realmResource = keycloak.realm(realmName);
        UsersResource usersResource = realmResource.users();

        List<UserRepresentation> users = usersResource.searchByEmail(email, true);

        if (users.size() > 1) {
            throw new Exception("More than one user found matching the email " + email);
        }

        return !users.isEmpty();
    }
}
