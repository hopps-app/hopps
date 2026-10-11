package app.hopps.bankimport.audit;

import app.hopps.audit.domain.AuditAction;
import app.hopps.audit.domain.AuditEntityType;
import app.hopps.audit.domain.AuditLog;
import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankImport;
import app.hopps.bankimport.domain.BankImportStatus;
import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
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
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Ignoring a bank transaction, taking that back and deleting an import are recorded in the audit log. Links to
 * bookkeeping transactions stay on the transaction's own audit; the import's delete entry lists the ones it removed.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
class BankAuditTest {

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    EntityManager em;

    private Long importId;
    private Long bankTxId;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        seed();
    }

    /** One finished import with one bank transaction of -50.00 for Alice's organization (id 4). */
    @Transactional
    void seed() {
        Organization org = organizationRepository.findById(4L);

        BankAccount account = new BankAccount();
        account.setOrganization(org);
        account.setBommel(bommelRepository.findById(23L));
        account.setName("Audit Account");
        account.setIban("DE89370400440532013000");
        account.setCreatedBy("alice@example.test");
        em.persist(account);

        BankImport bankImport = new BankImport();
        bankImport.setOrganization(org);
        bankImport.setBankAccount(account);
        bankImport.setFileName("audit.csv");
        bankImport.setFileSize(0);
        bankImport.setFileSha256("test-sha-audit");
        bankImport.setImportedBy("alice@example.test");
        bankImport.setStatus(BankImportStatus.COMPLETED);
        em.persist(bankImport);

        BankTransaction tx = new BankTransaction();
        tx.setOrganization(org);
        tx.setBankAccount(account);
        tx.setBankImport(bankImport);
        tx.setBookingDate(LocalDate.of(2024, 3, 15));
        tx.setAmount(new BigDecimal("-50.00"));
        tx.setCurrency("EUR");
        tx.setCounterpartyName("Beta Cleaning");
        tx.setPurpose("Window cleaning");
        tx.setDedupeHash("audit-h1");
        em.persist(tx);

        importId = bankImport.getId();
        bankTxId = tx.getId();
    }

    @Transactional
    List<AuditLog> auditOf(AuditEntityType type, Long entityId) {
        return AuditLog.list("entityType = ?1 and entityId = ?2 order by id", type, entityId);
    }

    @Test
    void ignoreAndUnignoreAreRecordedOnce() {
        given().when().post("/bank-transactions/{id}/ignore", bankTxId).then().statusCode(204);
        // Ignoring an ignored movement changes nothing and writes nothing.
        given().when().post("/bank-transactions/{id}/ignore", bankTxId).then().statusCode(204);
        given().when().delete("/bank-transactions/{id}/ignore", bankTxId).then().statusCode(204);

        List<AuditLog> entries = auditOf(AuditEntityType.BANK_TRANSACTION, bankTxId);
        assertEquals(2, entries.size());
        assertEquals(AuditAction.IGNORE, entries.get(0).action);
        assertEquals(Map.of("old", "UNMATCHED", "new", "IGNORED"), entries.get(0).changes.get("status"));
        assertEquals(AuditAction.UNIGNORE, entries.get(1).action);
        assertEquals(Map.of("old", "IGNORED", "new", "UNMATCHED"), entries.get(1).changes.get("status"));
        assertEquals("alice@example.test", entries.get(0).actorEmail);
    }

    @Test
    @SuppressWarnings("unchecked")
    void deletingAnImportRecordsWhatItRemoved() {
        Integer transactionId = given()
                .contentType("application/json")
                .body("""
                        { "name": "Window cleaning", "total": -50.00, "privatelyPaid": false }
                        """)
                .when()
                .post("/transactions")
                .then()
                .statusCode(201)
                .extract()
                .path("id");
        given()
                .contentType("application/json")
                .body("{ \"transactionId\": " + transactionId + " }")
                .when()
                .post("/bank-transactions/{id}/matches", bankTxId)
                .then()
                .statusCode(204);

        given().when().delete("/imports/{id}", importId).then().statusCode(204);

        List<AuditLog> entries = auditOf(AuditEntityType.BANK_IMPORT, importId);
        assertEquals(1, entries.size());
        AuditLog entry = entries.get(0);
        assertEquals(AuditAction.DELETE, entry.action);
        assertEquals("audit.csv", entry.snapshot.get("fileName"));
        assertEquals("Audit Account", entry.snapshot.get("bankAccountName"));
        assertEquals(1, ((Number) entry.snapshot.get("bankTransactions")).intValue());
        assertEquals(1, ((Number) entry.snapshot.get("assigned")).intValue());
        List<Map<String, Object>> links = (List<Map<String, Object>>) entry.snapshot.get("removedLinks");
        assertEquals(1, links.size());
        assertEquals(transactionId.longValue(), ((Number) links.get(0).get("transactionId")).longValue());
        assertEquals("50", links.get(0).get("matchedAmount"));
    }
}
