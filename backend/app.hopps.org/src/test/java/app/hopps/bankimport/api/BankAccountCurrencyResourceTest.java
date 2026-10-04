package app.hopps.bankimport.api;

import app.hopps.organization.domain.Currency;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
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

/**
 * Bank accounts are kept in the organization's currency, and the IBAN has to fit it: Swiss and Liechtenstein IBANs mean
 * CHF, all others EUR. Alice's organization (id 4) keeps its books in EUR and owns account 1 (German IBAN).
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(BankAccountResource.class)
class BankAccountCurrencyResourceTest {

    private static final long ORGANIZATION_ID = 4L;
    private static final long ACCOUNT_ID = 1L;
    private static final String GERMAN_IBAN = "DE21500105171234567890";
    private static final String SWISS_IBAN = "CH9300762011623852957";

    @Inject
    OrganizationRepository organizationRepository;

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
    void newAccountTakesTheOrganizationCurrency() {
        createAccount("{\"name\":\"Giro\",\"iban\":\"" + GERMAN_IBAN + "\"}")
                .statusCode(201)
                .body("currency", is("EUR"));
    }

    @Test
    void swissIbanIsRejectedInEuroOrganization() {
        createAccount("{\"name\":\"Konto\",\"iban\":\"" + SWISS_IBAN + "\"}").statusCode(400);
    }

    @Test
    void swissIbanIsAcceptedInFrancOrganization() {
        switchOrganizationTo(Currency.CHF);

        createAccount("{\"name\":\"Konto\",\"iban\":\"" + SWISS_IBAN + "\"}")
                .statusCode(201)
                .body("currency", is("CHF"));
        createAccount("{\"name\":\"Giro\",\"iban\":\"" + GERMAN_IBAN + "\"}").statusCode(400);
    }

    @Test
    void otherCurrencyThanTheOrganizationIsRejected() {
        createAccount("{\"name\":\"Giro\",\"iban\":\"" + GERMAN_IBAN + "\",\"currency\":\"CHF\"}").statusCode(400);
    }

    @Test
    void currencyCannotBeChangedButMayBeResent() {
        updateAccount("{\"currency\":\"CHF\"}").statusCode(400);

        updateAccount("{\"currency\":\"EUR\",\"name\":\"Renamed\"}")
                .statusCode(200)
                .body("name", is("Renamed"))
                .body("currency", is("EUR"));
    }

    @Test
    void ibanCannotBeChangedToAnotherCurrencyArea() {
        updateAccount("{\"iban\":\"" + SWISS_IBAN + "\"}").statusCode(400);
    }

    private ValidatableResponse createAccount(String body) {
        return given().contentType(ContentType.JSON).body(body).post().then();
    }

    private ValidatableResponse updateAccount(String body) {
        return given().contentType(ContentType.JSON).body(body).patch("/{id}", ACCOUNT_ID).then();
    }

    private void switchOrganizationTo(Currency currency) {
        QuarkusTransaction.requiringNew().run(() -> {
            Organization organization = organizationRepository.findById(ORGANIZATION_ID);
            organization.setCurrency(currency);
        });
    }
}
