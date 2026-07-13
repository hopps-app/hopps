package app.hopps.bankimport.api;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.is;

/**
 * Covers the free-text and amount-range filtering of the cross-account bank transaction listing. The amount range
 * filters on the magnitude (absolute value), so it matches both incoming (positive) and outgoing (negative) movements.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(BankTransactionResource.class)
class BankTransactionResourceTest {

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    EntityManager em;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        seedBankTransactions();
    }

    /**
     * Seeds four bank transactions for alice's organization (id 4) with distinct amounts, counterparties and purposes:
     * <ul>
     * <li>+100.00 "Alpha Supplies" / "Office chairs"</li>
     * <li>-50.00 "Beta Cleaning" / "Window cleaning"</li>
     * <li>+250.50 "Gamma Consulting" / "Strategy workshop"</li>
     * <li>-25.00 "Delta Shop" / "Coffee"</li>
     * </ul>
     */
    @Transactional
    void seedBankTransactions() {
        // The testdata already ships bank transactions (and matches) for several orgs; clear them so this test controls
        // the exact result set. Matches reference bank transactions, so they must go first.
        em.createQuery("DELETE FROM BankTransactionMatch").executeUpdate();
        em.createQuery("DELETE FROM BankTransaction").executeUpdate();

        Organization org = organizationRepository.findById(4L);

        BankAccount account = new BankAccount();
        account.setOrganization(org);
        account.setBommel(bommelRepository.findById(23L));
        account.setName("Test Account");
        account.setIban("DE89370400440532013000");
        account.setCreatedBy("alice@example.test");
        em.persist(account);

        BankImport bankImport = new BankImport();
        bankImport.setOrganization(org);
        bankImport.setBankAccount(account);
        bankImport.setFileName("test.csv");
        bankImport.setFileSize(0);
        bankImport.setFileSha256("test-sha-bank-tx");
        bankImport.setImportedBy("alice@example.test");
        em.persist(bankImport);

        persistTx(org, account, bankImport, "100.00", "Alpha Supplies", "Office chairs", LocalDate.of(2024, 3, 1),
                "h1");
        persistTx(org, account, bankImport, "-50.00", "Beta Cleaning", "Window cleaning", LocalDate.of(2024, 3, 15),
                "h2");
        persistTx(org, account, bankImport, "250.50", "Gamma Consulting", "Strategy workshop", LocalDate.of(2024, 4, 1),
                "h3");
        persistTx(org, account, bankImport, "-25.00", "Delta Shop", "Coffee", LocalDate.of(2024, 2, 1), "h4");
    }

    private void persistTx(Organization org, BankAccount account, BankImport bankImport, String amount,
            String counterparty, String purpose, LocalDate date, String hash) {
        BankTransaction tx = new BankTransaction();
        tx.setOrganization(org);
        tx.setBankAccount(account);
        tx.setBankImport(bankImport);
        tx.setBookingDate(date);
        tx.setAmount(new BigDecimal(amount));
        tx.setCurrency("EUR");
        tx.setCounterpartyName(counterparty);
        tx.setPurpose(purpose);
        tx.setDedupeHash(hash);
        em.persist(tx);
    }

    @Test
    void shouldListAllTransactions() {
        given().when().get().then().statusCode(200).body("size()", is(4));
    }

    @Test
    void shouldFilterByMinAmountMagnitude() {
        // abs(amount) >= 100 → 100.00 and 250.50 (the -50 and -25 are below the threshold by magnitude).
        given()
                .queryParam("minAmount", "100")
                .when()
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(2))
                .body("counterpartyName", containsInAnyOrder("Alpha Supplies", "Gamma Consulting"));
    }

    @Test
    void shouldFilterByMaxAmountMagnitude() {
        // abs(amount) <= 50 → -50.00 and -25.00.
        given()
                .queryParam("maxAmount", "50")
                .when()
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(2))
                .body("counterpartyName", containsInAnyOrder("Beta Cleaning", "Delta Shop"));
    }

    @Test
    void shouldFilterByAmountRange() {
        // 40 <= abs(amount) <= 120 → 100.00 and -50.00 (250.50 too high, -25.00 too low).
        given()
                .queryParam("minAmount", "40")
                .queryParam("maxAmount", "120")
                .when()
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(2))
                .body("counterpartyName", containsInAnyOrder("Alpha Supplies", "Beta Cleaning"));
    }

    @Test
    void shouldAcceptCommaDecimalSeparatorForAmount() {
        // German-formatted "250,50" must parse identically to 250.50 → only the 250.50 transaction.
        given()
                .queryParam("minAmount", "250,50")
                .when()
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].counterpartyName", is("Gamma Consulting"));
    }

    @Test
    void shouldFilterBySearchOnCounterparty() {
        given()
                .queryParam("search", "beta")
                .when()
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].counterpartyName", is("Beta Cleaning"));
    }

    @Test
    void shouldCombineSearchAndAmountRange() {
        // search matches Alpha (Office) and would match nothing else; combined with minAmount 100 keeps Alpha only.
        given()
                .queryParam("search", "office")
                .queryParam("minAmount", "100")
                .when()
                .get()
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].counterpartyName", is("Alpha Supplies"));
    }

    @Test
    void shouldReflectAmountFilterInAggregate() {
        // Aggregate over abs(amount) >= 100 → only the two incoming transactions (100.00 and 250.50).
        given()
                .queryParam("minAmount", "100")
                .when()
                .get("/aggregate")
                .then()
                .statusCode(200)
                .body("count", is(2));
    }

    @Test
    void shouldSortByAmountDescendingByMagnitudeIndependent() {
        // Plain amount sort is signed (not magnitude): desc → 250.50, 100.00, -25.00, -50.00.
        given()
                .queryParam("sort", "amount")
                .queryParam("direction", "desc")
                .when()
                .get()
                .then()
                .statusCode(200)
                .body("counterpartyName",
                        contains("Gamma Consulting", "Alpha Supplies", "Delta Shop", "Beta Cleaning"));
    }
}
