package app.hopps.org.rest;

import app.hopps.org.jpa.Member;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.RestAssured;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;

@QuarkusTest
@TestSecurity(authorizationEnabled = false)
@TestHTTPEndpoint(MemberResource.class)
class MemberResourceTests {

    @Test
    @DisplayName("should validate valid Mitglied")
    void shouldValidateValidMitglied() {

        // given
        Member ferdi = new Member();
        ferdi.setFirstName("Ferdi");
        ferdi.setLastName("Fußballer");
        ferdi.setEmail("ferdi@example.com");

        RestAssured.given()
                .contentType("application/json")
                .body(ferdi)
                .when()
                .post("/validate")
                .then()
                .statusCode(200);
    }

    @Test
    @DisplayName("should invalidate Mitglied with invalid Email")
    void shouldInvalidateMitgliedWithInvalidEmail() {

        // given
        Member ferdi = new Member();
        ferdi.setFirstName("Ferdi");
        ferdi.setLastName("Fußballer");
        ferdi.setEmail("ferdi-at-example.com");

        RestAssured.given()
                .contentType("application/json")
                .body(ferdi)
                .when()
                .post("/validate")
                .then()
                .statusCode(400)
                .body("violations", hasSize(1))
                .body("violations[0].propertyPath", equalTo("email"))
                .body("violations[0].message", equalTo("must be a well-formed email address"));
    }
}
