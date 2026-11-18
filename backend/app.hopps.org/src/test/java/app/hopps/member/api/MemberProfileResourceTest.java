package app.hopps.member.api;

import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
@TestHTTPEndpoint(MemberResource.class)
class MemberProfileResourceTest {

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @BeforeEach
    void cleanDatabase() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    @Test
    @DisplayName("should return the founder's profile with role and permissions")
    @TestSecurity(user = "alice@example.test")
    @OidcSecurity(claims = @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a"))
    void shouldReturnMyProfile() {
        given()
                .when()
                .get("me")
                .then()
                .statusCode(200)
                .body("firstName", is("Alice"))
                .body("email", is("alice@example.test"))
                .body("organizationName", is("Theatervereine Bühnefrei e.V."))
                .body("role", is("OWNER"))
                .body("permissions", hasItems("VIEW_BOOKKEEPING", "MANAGE_MEMBERS"));
    }

    @Test
    @DisplayName("should show a board member only the read permission")
    @TestSecurity(user = "bob@example.test")
    @OidcSecurity(claims = @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000023"))
    void shouldReturnBoardPermissions() {
        given()
                .when()
                .get("me")
                .then()
                .statusCode(200)
                .body("role", is("BOARD"))
                .body("permissions", is(java.util.List.of("VIEW_BOOKKEEPING")));
    }

    @Test
    @DisplayName("should change name and phone number, and remove an empty phone number")
    @TestSecurity(user = "alice@example.test")
    @OidcSecurity(claims = @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a"))
    void shouldUpdateMyProfile() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"firstName\": \" Alicia \", \"lastName\": \"Muster\", \"phoneNumber\": \"+49 170 1234567\"}")
                .when()
                .put("me")
                .then()
                .statusCode(200)
                .body("firstName", is("Alicia"))
                .body("lastName", is("Muster"))
                .body("phoneNumber", is("+49 170 1234567"))
                .body("email", is("alice@example.test"));

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"phoneNumber\": \"  \"}")
                .when()
                .put("me")
                .then()
                .statusCode(200)
                .body("firstName", is("Alicia"))
                .body("phoneNumber", is(nullValue()));
    }

    @Test
    @DisplayName("should reject a blank name and a phone number with letters")
    @TestSecurity(user = "alice@example.test")
    @OidcSecurity(claims = @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a"))
    void shouldRejectInvalidProfile() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"firstName\": \" \"}")
                .when()
                .put("me")
                .then()
                .statusCode(400);

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"phoneNumber\": \"call me\"}")
                .when()
                .put("me")
                .then()
                .statusCode(400);

        given()
                .when()
                .get("me")
                .then()
                .statusCode(200)
                .body("firstName", is("Alice"))
                .body("phoneNumber", not("call me"));
    }
}
