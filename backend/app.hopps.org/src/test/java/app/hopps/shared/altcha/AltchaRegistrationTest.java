package app.hopps.shared.altcha;

import app.hopps.organization.repository.OrganizationRepository;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import io.restassured.path.json.JsonPath;
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

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * The public registration with spam protection switched on, as a browser goes through it: fetch a challenge, solve it,
 * register with the solution.
 */
@QuarkusTest
@TestProfile(AltchaEnabledProfile.class)
class AltchaRegistrationTest {

    private static final List<String> EMAILS = List.of("kassier@altcha-verein.test", "zweiter@altcha-verein.test");

    @Inject
    Flyway flyway;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    Keycloak keycloak;

    @Inject
    @ConfigProperty(name = "app.hopps.org.auth.realm-name")
    String realmName;

    @BeforeEach
    void cleanUp() {
        flyway.clean();
        flyway.migrate();
        // Registration provisions Keycloak accounts, which outlive the database reset between tests.
        UsersResource users = keycloak.realm(realmName).users();
        for (String email : EMAILS) {
            users.searchByEmail(email, true).forEach(user -> users.delete(user.getId()).close());
        }
    }

    private static String registration(String email, String slug, String altcha) {
        String altchaField = altcha == null ? "" : ", \"altcha\": \"%s\"".formatted(altcha);
        return """
                {
                  "owner": {"email": "%s", "firstName": "Maria", "lastName": "Muster"},
                  "newPassword": "registerPassword1!",
                  "organization": {"name": "Altcha Verein %s", "slug": "%s", "type": "EINGETRAGENER_VEREIN"}%s
                }
                """.formatted(email, slug, slug, altchaField);
    }

    private static String solvedChallenge() {
        JsonPath challenge = given()
                .when()
                .get("/public/altcha/challenge")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        return AltchaTestSolver.solve(challenge.getMap("parameters"), challenge.getString("signature"));
    }

    @Test
    @DisplayName("issues a fresh, uncached challenge without login")
    void issuesChallenge() {
        given()
                .when()
                .get("/public/altcha/challenge")
                .then()
                .statusCode(200)
                .header("Cache-Control", "no-store")
                .body("parameters.algorithm", equalTo("PBKDF2/SHA-256"))
                .body("parameters.keyPrefix", notNullValue())
                .body("signature", notNullValue());
    }

    @Test
    @DisplayName("refuses a registration without a solved challenge and creates nothing")
    void rejectsRegistrationWithoutChallenge() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(registration(EMAILS.get(0), "altcha-verein-a", null))
                .when()
                .post("/organization")
                .then()
                .statusCode(400)
                .body("code", is(AltchaFailedException.CODE));

        assertNull(organizationRepository.findBySlug("altcha-verein-a"));
    }

    @Test
    @DisplayName("registers with a solved challenge, but only once per challenge")
    void registersOncePerChallenge() {
        String altcha = solvedChallenge();

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(registration(EMAILS.get(0), "altcha-verein-a", altcha))
                .when()
                .post("/organization")
                .then()
                .statusCode(201)
                .body("slug", is("altcha-verein-a"));

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(registration(EMAILS.get(1), "altcha-verein-b", altcha))
                .when()
                .post("/organization")
                .then()
                .statusCode(400)
                .body("code", is(AltchaFailedException.CODE));
    }

    @Test
    @DisplayName("checks the challenge before anything that would reveal an existing email")
    void checksChallengeBeforeConflicts() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(registration(EMAILS.get(0), "altcha-verein-a", solvedChallenge()))
                .when()
                .post("/organization")
                .then()
                .statusCode(201);

        // The same email again: with a solution this would be 409, without one it must not say so.
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(registration(EMAILS.get(0), "altcha-verein-b", null))
                .when()
                .post("/organization")
                .then()
                .statusCode(400)
                .body("code", is(AltchaFailedException.CODE));
    }

    @Test
    @DisplayName("keeps the conflict answer for a solved registration with a taken email")
    void conflictWithSolvedChallenge() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(registration(EMAILS.get(0), "altcha-verein-a", solvedChallenge()))
                .when()
                .post("/organization")
                .then()
                .statusCode(201);

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(registration(EMAILS.get(0), "altcha-verein-b", solvedChallenge()))
                .when()
                .post("/organization")
                .then()
                .statusCode(409);
    }
}
