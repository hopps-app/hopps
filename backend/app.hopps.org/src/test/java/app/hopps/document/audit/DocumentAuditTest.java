package app.hopps.document.audit;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;

import app.hopps.audit.domain.AuditAction;
import app.hopps.audit.domain.AuditEntityType;
import app.hopps.audit.domain.AuditLog;
import app.hopps.document.api.DocumentResource;
import app.hopps.document.service.DocumentAnalysisService;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.core.MediaType;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * What users do with a receipt ends up in the audit trail, with who did it, and the trail outlives the receipt.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(DocumentResource.class)
class DocumentAuditTest {

    @InjectMock
    DocumentAnalysisService analysisServiceMock;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        // The analysis runs in the background and is covered by DocumentAuditorTest.
        doNothing().when(analysisServiceMock).analyzeAsync(anyLong());
    }

    @Transactional
    List<AuditLog> auditOf(Long documentId) {
        return AuditLog.list("entityType = ?1 and entityId = ?2 order by id", AuditEntityType.DOCUMENT, documentId);
    }

    private Long upload() {
        InputStream pdf = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(pdf);
        Integer id = given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", pdf, "application/pdf")
                .queryParam("analyze", false)
                .when()
                .post()
                .then()
                .statusCode(201)
                .extract()
                .path("id");
        return id.longValue();
    }

    private void patch(Long id, String body) {
        given()
                .contentType("application/json")
                .body(body)
                .when()
                .patch("/{id}", id)
                .then()
                .statusCode(200);
    }

    @Test
    void recordsWhoUploadedTheReceipt() {
        Long id = upload();

        List<AuditLog> entries = auditOf(id);

        assertEquals(1, entries.size());
        AuditLog entry = entries.get(0);
        assertEquals(AuditAction.CREATE, entry.action);
        assertEquals("alice@example.test", entry.actorEmail);
        assertEquals("Alice Musterfrau", entry.actorName);
        assertEquals(4L, entry.organizationId);
        assertEquals("ZUGFeRD.pdf", entry.snapshot.get("fileName"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void recordsChangedFieldsOnly() {
        Long id = upload();

        patch(id, """
                { "name": "Getränke", "total": 12.50, "privatelyPaid": false }
                """);
        // The same values again: nothing changed, nothing recorded.
        patch(id, """
                { "name": "Getränke", "total": 12.5, "privatelyPaid": false }
                """);

        List<AuditLog> entries = auditOf(id);
        assertEquals(2, entries.size());
        AuditLog update = entries.get(1);
        assertEquals(AuditAction.UPDATE, update.action);
        assertEquals("Getränke", ((Map<String, Object>) update.changes.get("name")).get("new"));
        assertEquals("12.5", ((Map<String, Object>) update.changes.get("total")).get("new"));
    }

    @Test
    void recordsTheConfirmationWithTheCreatedTransaction() {
        Long id = upload();

        Integer transactionId = given()
                .contentType(MediaType.APPLICATION_JSON)
                .when()
                .post("/{id}/confirm", id)
                .then()
                .statusCode(200)
                .extract()
                .path("transactionId");

        AuditLog confirm = auditOf(id).get(1);
        assertEquals(AuditAction.CONFIRM, confirm.action);
        assertEquals(transactionId.longValue(), ((Number) confirm.changes.get("transactionId")).longValue());
    }

    @Test
    void recordsAReanalysisRequest() {
        Long id = upload();

        given().when().post("/{id}/reanalyze", id).then().statusCode(200);

        assertEquals(AuditAction.REANALYZE, auditOf(id).get(1).action);
    }

    @Test
    void theTrailOutlivesTheReceipt() {
        Long id = upload();

        given().when().delete("/{id}", id).then().statusCode(204);

        List<AuditLog> entries = auditOf(id);
        AuditLog delete = entries.get(entries.size() - 1);
        assertEquals(AuditAction.DELETE, delete.action);
        assertEquals("ZUGFeRD.pdf", delete.snapshot.get("fileName"));
    }
}
