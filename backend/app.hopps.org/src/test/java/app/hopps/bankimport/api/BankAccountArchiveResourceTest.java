package app.hopps.bankimport.api;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

/**
 * An account with linked movements cannot be archived, and what is archived stays out of the work lists: its movements
 * are hidden from the cross-account lists until the account is restored. They are not deleted.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
class BankAccountArchiveResourceTest {

    private static final long ORGANIZATION_ID = 4L;
    private static final String PURPOSE = "Archivtest Hallenmiete";

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    EntityManager em;

    private Long accountId;
    private Long bankTxId;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        QuarkusTransaction.requiringNew().run(this::seed);
    }

    /** An account with one open movement of -50.00. */
    private void seed() {
        var organization = organizationRepository.findById(ORGANIZATION_ID);

        BankAccount account = new BankAccount();
        account.setOrganization(organization);
        account.setBommel(organization.getRootBommel());
        account.setName("Archivkonto");
        account.setIban("DE89370400440532013000");
        account.setCreatedBy("alice@example.test");
        em.persist(account);

        BankImport bankImport = new BankImport();
        bankImport.setOrganization(organization);
        bankImport.setBankAccount(account);
        bankImport.setFileName("archiv.csv");
        bankImport.setFileSize(0);
        bankImport.setFileSha256("test-sha-archive");
        bankImport.setImportedBy("alice@example.test");
        bankImport.setStatus(BankImportStatus.COMPLETED);
        em.persist(bankImport);

        BankTransaction tx = new BankTransaction();
        tx.setOrganization(organization);
        tx.setBankAccount(account);
        tx.setBankImport(bankImport);
        tx.setBookingDate(LocalDate.of(2024, 3, 15));
        tx.setAmount(new BigDecimal("-50.00"));
        tx.setCurrency("EUR");
        tx.setPurpose(PURPOSE);
        tx.setDedupeHash("archive-h1");
        em.persist(tx);

        accountId = account.getId();
        bankTxId = tx.getId();
    }

    private int linkMovement() {
        int transactionId = given().contentType(ContentType.JSON)
                .body("{ \"name\": \"Hallenmiete\", \"total\": -50.00, \"privatelyPaid\": false }")
                .post("/transactions")
                .then()
                .statusCode(201)
                .extract()
                .path("id");
        given().contentType(ContentType.JSON)
                .body("{ \"transactionId\": " + transactionId + " }")
                .post("/bank-transactions/{id}/matches", bankTxId)
                .then()
                .statusCode(204);
        return transactionId;
    }

    @Test
    void anAccountWithLinkedMovementsCannotBeArchived() {
        int transactionId = linkMovement();

        given().get("/bankaccounts/{id}", accountId).then().statusCode(200).body("linked", is(true));
        given().delete("/bankaccounts/{id}", accountId).then().statusCode(409).body("code", is("ACCOUNT_HAS_LINKS"));
        given().get("/bankaccounts/{id}", accountId).then().body("archived", is(false));

        // Releasing the link makes it possible.
        given().delete("/bank-transactions/{id}/matches/{tx}", bankTxId, transactionId).then().statusCode(204);
        given().get("/bankaccounts/{id}", accountId).then().body("linked", is(false));
        given().delete("/bankaccounts/{id}", accountId).then().statusCode(204);
    }

    @Test
    void movementsOfAnArchivedAccountStayOutOfTheCrossAccountLists() {
        given().queryParam("search", PURPOSE).get("/bank-transactions").then().statusCode(200).body("$", hasSize(1));

        given().delete("/bankaccounts/{id}", accountId).then().statusCode(204);

        given().queryParam("search", PURPOSE).get("/bank-transactions").then().statusCode(200).body("$", empty());
        given().queryParam("search", PURPOSE)
                .get("/bank-transactions/aggregate")
                .then()
                .statusCode(200)
                .body("count", is(0));
    }

    @Test
    void movementsOfAnArchivedAccountAreNotDeleted() {
        given().delete("/bankaccounts/{id}", accountId).then().statusCode(204);

        given().queryParam("accountIds", accountId).get("/bank-transactions").then().body("$", hasSize(1));

        given().post("/bankaccounts/{id}/restore", accountId).then().statusCode(200);
        given().queryParam("search", PURPOSE).get("/bank-transactions").then().body("$", hasSize(1));
    }
}
