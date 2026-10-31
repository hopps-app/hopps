package app.hopps.bankimport.api;

import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

/**
 * A bank account can only be deleted for good while it holds no bookkeeping data. Alice's account 1 has imports and
 * movements in the test data, so it stays; one created just now is unused.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(BankAccountResource.class)
class BankAccountDeleteResourceTest {

    private static final long USED_ACCOUNT_ID = 1L;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    @Test
    void unusedAccountIsDeletedForGood() {
        int id = given().contentType(ContentType.JSON)
                .body("{\"name\":\"Tippfehler\",\"iban\":\"DE21500105171234567890\"}")
                .post()
                .then()
                .statusCode(201)
                .body("deletable", is(true))
                .extract()
                .path("id");

        given().delete("/{id}/permanent", id).then().statusCode(204);

        given().get("/{id}", id).then().statusCode(404);
    }

    @Test
    void usedAccountCannotBeDeleted() {
        given().get("/{id}", USED_ACCOUNT_ID).then().statusCode(200).body("deletable", is(false));

        given().delete("/{id}/permanent", USED_ACCOUNT_ID).then().statusCode(409);

        given().get("/{id}", USED_ACCOUNT_ID).then().statusCode(200);
    }

    @Test
    void unknownAccountIsNotFound() {
        given().delete("/{id}/permanent", 999_999L).then().statusCode(404);
    }
}
