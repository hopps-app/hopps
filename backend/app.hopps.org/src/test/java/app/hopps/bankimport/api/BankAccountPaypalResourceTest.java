package app.hopps.bankimport.api;

import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

/**
 * A PayPal account has no IBAN; the PayPal login email tells it apart. Alice's organization (id 4) owns bank account 1.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(BankAccountResource.class)
class BankAccountPaypalResourceTest {

    private static final long BANK_ACCOUNT_ID = 1L;

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
    void paypalAccountNeedsNoIban() {
        createAccount("{\"name\":\"PayPal\",\"accountType\":\"PAYPAL\",\"paypalEmail\":\"Kasse@Verein.example\"}")
                .statusCode(201)
                .body("accountType", is("PAYPAL"))
                .body("paypalEmail", is("kasse@verein.example"))
                .body("iban", nullValue())
                .body("currency", is("EUR"));
    }

    @Test
    void paypalAccountNeedsItsEmail() {
        createAccount("{\"name\":\"PayPal\",\"accountType\":\"PAYPAL\"}").statusCode(400);
    }

    @Test
    void paypalAccountTakesNoIban() {
        createAccount("{\"name\":\"PayPal\",\"accountType\":\"PAYPAL\",\"paypalEmail\":\"kasse@verein.example\","
                + "\"iban\":\"DE21500105171234567890\"}").statusCode(400);
    }

    @Test
    void bankAccountStillNeedsAnIban() {
        createAccount("{\"name\":\"Giro\"}").statusCode(400);
        given().get("/{id}", BANK_ACCOUNT_ID).then().statusCode(200).body("accountType", is("BANK"));
    }

    @Test
    void bankAccountTakesNoPaypalEmail() {
        given().contentType(ContentType.JSON)
                .body("{\"paypalEmail\":\"kasse@verein.example\"}")
                .patch("/{id}", BANK_ACCOUNT_ID)
                .then()
                .statusCode(400);
    }

    private ValidatableResponse createAccount(String body) {
        return given().contentType(ContentType.JSON).body(body).post().then();
    }
}
