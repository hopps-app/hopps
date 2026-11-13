package app.hopps.organization.api;

import io.quarkus.mailer.Mail;
import io.quarkus.mailer.MockMailbox;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.UsersResource;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * A registration on an installation that wants to hear about new organizations: the configured recipient gets a mail
 * naming the association and its contact person.
 */
@QuarkusTest
@TestProfile(RegistrationNotificationTest.NotifyProfile.class)
class RegistrationNotificationTest {

    private static final String TEAM = "team@hopps.test";
    private static final String OWNER = "vorstand@notify-verein.test";

    public static class NotifyProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("hopps.registration.notification-recipients", TEAM);
        }
    }

    @Inject
    MockMailbox mailbox;

    @Inject
    Flyway flyway;

    @Inject
    Keycloak keycloak;

    @Inject
    @ConfigProperty(name = "app.hopps.org.auth.realm-name")
    String realmName;

    @BeforeEach
    void cleanUp() {
        flyway.clean();
        flyway.migrate();
        mailbox.clear();
        UsersResource users = keycloak.realm(realmName).users();
        users.searchByEmail(OWNER, true).forEach(user -> users.delete(user.getId()).close());
    }

    @Test
    @DisplayName("mails the team about a new registration")
    void mailsAboutRegistration() throws InterruptedException {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "owner": {"email": "%s", "firstName": "Maria", "lastName": "Muster"},
                          "newPassword": "registerPassword1!",
                          "organization": {"name": "Notify Verein", "slug": "notify-verein", "type": "EINGETRAGENER_VEREIN"}
                        }
                        """
                        .formatted(OWNER))
                .when()
                .post("/organization")
                .then()
                .statusCode(201);

        // Sent in the background after the response.
        List<Mail> mails = List.of();
        for (int i = 0; i < 50 && mails.isEmpty(); i++) {
            mails = mailbox.getMailsSentTo(TEAM);
            Thread.sleep(100);
        }
        assertEquals(1, mails.size());
        assertEquals("Neue Registrierung: Notify Verein", mails.get(0).getSubject());
        assertTrue(mails.get(0).getText().contains("Ansprechperson:   Maria Muster"));
        assertEquals(OWNER, mails.get(0).getReplyTo());
    }
}
