package app.hopps.bankimport.api;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;
import app.hopps.bankimport.service.DedupeHashService;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

/**
 * The same bank movements must not end up in two accounts: an IBAN belongs to one account, archived ones included, and
 * a file imported into one account is refused for the others. Alice's organization (id 4) owns account 1.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
class BankAccountDuplicateResourceTest {

    private static final long ORGANIZATION_ID = 4L;
    private static final long TARGET_ACCOUNT_ID = 1L;
    private static final String IBAN = "DE89370400440532013000";
    private static final byte[] FILE = ":20:STATEMENT\n:25:DE89370400440532013000\n:60F:C260101EUR0,00\n"
            .getBytes(StandardCharsets.UTF_8);

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    EntityManager em;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    private ValidatableResponse createAccount(String name) {
        return given().contentType(ContentType.JSON)
                .body("{\"name\":\"" + name + "\",\"iban\":\"" + IBAN + "\"}")
                .post("/bankaccounts")
                .then();
    }

    private int archivedAccount() {
        int id = createAccount("Altes Konto").statusCode(201).extract().path("id");
        given().delete("/bankaccounts/{id}", id).then().statusCode(204);
        return id;
    }

    /** An account holding an import of {@link #FILE} with the given status. */
    private void importedInto(boolean archived, BankImportStatus status) {
        QuarkusTransaction.requiringNew().run(() -> {
            var organization = organizationRepository.findById(ORGANIZATION_ID);
            BankAccount account = new BankAccount();
            account.setOrganization(organization);
            account.setBommel(organization.getRootBommel());
            account.setName("Erstes Konto");
            account.setIban(IBAN);
            account.setCreatedBy("alice@example.test");
            account.setArchived(archived);
            em.persist(account);

            BankImport bankImport = new BankImport();
            bankImport.setOrganization(organization);
            bankImport.setBankAccount(account);
            bankImport.setFileName("auszug.sta");
            bankImport.setFileSize(FILE.length);
            bankImport.setFileSha256(DedupeHashService.sha256(FILE));
            bankImport.setImportedBy("alice@example.test");
            bankImport.setStatus(status);
            em.persist(bankImport);
        });
    }

    private ValidatableResponse uploadToTargetAccount() {
        return given().multiPart("file", "auszug.sta", FILE, "text/plain")
                .post("/bankaccounts/{id}/imports", TARGET_ACCOUNT_ID)
                .then();
    }

    @Test
    void anActiveIbanCannotBeUsedTwice() {
        createAccount("Giro").statusCode(201);

        createAccount("Giro 2").statusCode(409).body("code", is("IBAN_IN_USE"));
    }

    @Test
    void theIbanOfAnArchivedAccountPointsToThatAccount() {
        int archivedId = archivedAccount();

        createAccount("Neues Konto")
                .statusCode(409)
                .body("code", is("IBAN_ARCHIVED"))
                .body("archivedAccountId", is(archivedId))
                .body("archivedAccountName", is("Altes Konto"));
    }

    @Test
    void anAccountCannotTakeOverTheIbanOfAnArchivedOne() {
        int archivedId = archivedAccount();

        given().contentType(ContentType.JSON)
                .body("{\"iban\":\"" + IBAN + "\"}")
                .patch("/bankaccounts/{id}", TARGET_ACCOUNT_ID)
                .then()
                .statusCode(409)
                .body("code", is("IBAN_ARCHIVED"))
                .body("archivedAccountId", is(archivedId));
    }

    @Test
    void restoringIsRefusedWhileAnActiveAccountHasTheIban() {
        importedInto(true, BankImportStatus.COMPLETED);
        createAccountDespiteArchivedOne();
        long archivedId = archivedAccountId();

        given().post("/bankaccounts/{id}/restore", archivedId).then().statusCode(409).body("code", is("IBAN_IN_USE"));
    }

    @Test
    void anArchivedAccountCanBeRestored() {
        int archivedId = archivedAccount();

        given().post("/bankaccounts/{id}/restore", archivedId).then().statusCode(200).body("archived", is(false));
    }

    /** Two accounts with one IBAN can only come from before the check; the data is set up directly. */
    private void createAccountDespiteArchivedOne() {
        QuarkusTransaction.requiringNew().run(() -> {
            var organization = organizationRepository.findById(ORGANIZATION_ID);
            BankAccount account = new BankAccount();
            account.setOrganization(organization);
            account.setBommel(organization.getRootBommel());
            account.setName("Aktives Konto");
            account.setIban(IBAN);
            account.setCreatedBy("alice@example.test");
            em.persist(account);
        });
    }

    private long archivedAccountId() {
        return QuarkusTransaction.requiringNew()
                .call(() -> em.createQuery("SELECT a.id FROM BankAccount a WHERE a.iban = :iban AND a.archived = true",
                        Long.class)
                        .setParameter("iban", IBAN)
                        .getSingleResult());
    }

    @Test
    void aFileImportedIntoAnotherAccountIsRefused() {
        importedInto(false, BankImportStatus.COMPLETED);

        uploadToTargetAccount()
                .statusCode(409)
                .body("code", is("FILE_ALREADY_IMPORTED"))
                .body("accountName", is("Erstes Konto"))
                .body("accountArchived", is(false));
    }

    @Test
    void aFileImportedIntoAnArchivedAccountIsRefused() {
        importedInto(true, BankImportStatus.COMPLETED);

        uploadToTargetAccount()
                .statusCode(409)
                .body("code", is("FILE_ALREADY_IMPORTED"))
                .body("accountArchived", is(true));
    }

    @Test
    void aFailedImportDoesNotBlockTheFile() {
        importedInto(false, BankImportStatus.FAILED);

        uploadToTargetAccount().statusCode(202);
    }
}
