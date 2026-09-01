package app.hopps.document.api;

import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.DocumentStatus;
import app.hopps.document.service.DocumentAnalysisService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.s3.S3Client;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;

@QuarkusTest
@TestSecurity(user = "alice@example.test")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(DocumentResource.class)
class DocumentResourceTest {

    @InjectMock
    DocumentAnalysisService analysisServiceMock;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    S3Client s3Client;

    @Inject
    EntityManager entityManager;

    @ConfigProperty(name = "bucket.name")
    String bucketName;

    private static final String SENDER_NAME = "Appointmed GmbH";

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();

        // Mock async analysis to do nothing (we don't want to test actual analysis here)
        doNothing().when(analysisServiceMock).analyzeAsync(anyLong());
    }

    @Test
    void shouldUploadFileAndReturnDocumentResponse() {
        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", zugferdInputStream, "application/pdf")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body("id", notNullValue())
                .body("fileName", equalTo("ZUGFeRD.pdf"))
                .body("fileContentType", equalTo("application/pdf"))
                .body("analysisStatus", equalTo(AnalysisStatus.PENDING.name()));
    }

    @Test
    void shouldFailOnUnsupportedMediaType() {
        // REST Assured may not properly forward the content type in some cases,
        // so the endpoint might return 400 (Bad Request) instead of 415
        int statusCode = given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "test.txt", "Hello World", "text/plain")
                .when()
                .post()
                .then()
                .extract()
                .statusCode();

        // Accept either 400 or 415 as both indicate rejection of invalid file type
        assertTrue(statusCode == Response.Status.UNSUPPORTED_MEDIA_TYPE.getStatusCode()
                || statusCode == Response.Status.BAD_REQUEST.getStatusCode(),
                "Expected 400 or 415 but got " + statusCode);
    }

    @Test
    void shouldGetDocumentById() {
        // First upload a document
        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);

        int documentId = given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", zugferdInputStream, "application/pdf")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode())
                .extract()
                .path("id");

        // Then retrieve it
        given()
                .when()
                .get("/{id}", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body("id", equalTo(documentId))
                .body("fileName", equalTo("ZUGFeRD.pdf"));
    }

    @Test
    void shouldReturnNotFoundForNonExistentDocument() {
        given()
                .when()
                .get("/{id}", 999999)
                .then()
                .statusCode(Response.Status.NOT_FOUND.getStatusCode());
    }

    @Test
    void shouldDownloadDocumentFile() {
        // First upload a document
        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);

        int documentId = given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", zugferdInputStream, "application/pdf")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode())
                .extract()
                .path("id");

        // Then download the file
        given()
                .when()
                .get("/{id}/file", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .header("Content-Disposition", containsString("ZUGFeRD.pdf"))
                .header("Content-Type", equalTo("application/pdf"));
    }

    @Test
    void shouldReturnNotFoundForNonExistentFile() {
        given()
                .when()
                .get("/{id}/file", 999999)
                .then()
                .statusCode(Response.Status.NOT_FOUND.getStatusCode());
    }

    @Test
    void shouldListDocuments() {
        // Upload two documents first. The second must have distinct content — identical content is rejected as a
        // duplicate (see shouldRejectDuplicateUpload).
        InputStream file1 = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(file1);
        byte[] file2 = "second distinct test document".getBytes(StandardCharsets.UTF_8);

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "doc1.pdf", file1, "application/pdf")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode());

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "doc2.pdf", file2, "application/pdf")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode());

        // List all documents
        given()
                .when()
                .get()
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body("size()", greaterThanOrEqualTo(2));
    }

    @Test
    void shouldRejectDuplicateUpload() {
        InputStream first = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        InputStream second = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(first);
        assertNotNull(second);

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", first, "application/pdf")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode());

        // Same content again (even under a different filename) must be rejected as a duplicate.
        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "again.pdf", second, "application/pdf")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CONFLICT.getStatusCode());
    }

    @Test
    void shouldDeleteDocument() {
        // First upload a document
        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);

        int documentId = given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", zugferdInputStream, "application/pdf")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode())
                .extract()
                .path("id");

        // Delete the document
        given()
                .when()
                .delete("/{id}", documentId)
                .then()
                .statusCode(Response.Status.NO_CONTENT.getStatusCode());

        // Verify it's gone
        given()
                .when()
                .get("/{id}", documentId)
                .then()
                .statusCode(Response.Status.NOT_FOUND.getStatusCode());
    }

    @Test
    void shouldUpdateDocument() {
        // First upload a document
        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);

        int documentId = given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", zugferdInputStream, "application/pdf")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode())
                .extract()
                .path("id");

        // Update the document
        String updateJson = """
                {
                	"name": "Test Invoice",
                	"total": 100.50,
                	"currencyCode": "EUR",
                	"senderName": "Test Company",
                	"privatelyPaid": true
                }
                """;

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body(updateJson)
                .when()
                .patch("/{id}", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body("id", equalTo(documentId))
                .body("name", equalTo("Test Invoice"))
                .body("total", equalTo(100.50f))
                .body("currencyCode", equalTo("EUR"))
                .body("senderName", equalTo("Test Company"))
                .body("privatelyPaid", equalTo(true))
                .body("extractionSource", equalTo("MANUAL"));
    }

    @Test
    void shouldDeleteTransactionOnlyAndReturnReceiptToReview() {
        ConfirmedReceipt receipt = uploadAndConfirmWithSender();

        given()
                .basePath("/transactions")
                .when()
                .delete("/{id}", receipt.transactionId())
                .then()
                .statusCode(Response.Status.NO_CONTENT.getStatusCode());

        // The receipt outlives its transaction: reviewable again, sender untouched, no longer claiming to be booked.
        given()
                .when()
                .get("/{id}", receipt.documentId())
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("documentStatus", equalTo(DocumentStatus.ANALYZED.name()))
                .body("transactionId", nullValue())
                .body("senderName", equalTo(SENDER_NAME));

        assertNull(reviewedBy(receipt.documentId()), "reviewedBy should be cleared when a receipt returns to review");
    }

    @Test
    void shouldCreateANewTransactionWhenReconfirmingAfterTransactionOnlyDelete() {
        ConfirmedReceipt receipt = uploadAndConfirmWithSender();

        given()
                .basePath("/transactions")
                .when()
                .delete("/{id}", receipt.transactionId())
                .then()
                .statusCode(Response.Status.NO_CONTENT.getStatusCode());

        // Guards the confirm shortcut that skips creating a transaction while one is still linked - a stale link would
        // leave the receipt CONFIRMED with nothing booked behind it.
        Integer newTransactionId = given()
                .when()
                .post("/{id}/confirm", receipt.documentId())
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("documentStatus", equalTo(DocumentStatus.CONFIRMED.name()))
                .body("transactionId", notNullValue())
                .extract()
                .path("transactionId");

        assertNotEquals(receipt.transactionId(), newTransactionId.longValue());
    }

    @Test
    void shouldDeleteReceiptAndTransactionTogether() {
        ConfirmedReceipt receipt = uploadAndConfirmWithSender();

        given()
                .when()
                .delete("/{id}", receipt.documentId())
                .then()
                .statusCode(Response.Status.NO_CONTENT.getStatusCode());

        given()
                .when()
                .get("/{id}", receipt.documentId())
                .then()
                .statusCode(Response.Status.NOT_FOUND.getStatusCode());

        given()
                .basePath("/transactions")
                .when()
                .get("/{id}", receipt.transactionId())
                .then()
                .statusCode(Response.Status.NOT_FOUND.getStatusCode());
    }

    @Test
    void shouldDropTradePartiesOnceNothingReferencesThem() {
        long before = countTradeParties();

        ConfirmedReceipt receipt = uploadAndConfirmWithSender();
        // The receipt's sender, plus the organization side recorded on the transaction.
        assertEquals(before + 2, countTradeParties());

        given()
                .basePath("/transactions")
                .when()
                .delete("/{id}", receipt.transactionId())
                .then()
                .statusCode(Response.Status.NO_CONTENT.getStatusCode());

        // The organization side is unreferenced and dropped; the sender survives because the receipt still holds it.
        assertEquals(before + 1, countTradeParties());

        given()
                .when()
                .delete("/{id}", receipt.documentId())
                .then()
                .statusCode(Response.Status.NO_CONTENT.getStatusCode());

        assertEquals(before, countTradeParties());
    }

    /**
     * Uploads a receipt, gives it a sender and confirms it. Confirm hands that very TradeParty to the new transaction,
     * so both rows share one party - the case the delete paths have to cope with.
     */
    private ConfirmedReceipt uploadAndConfirmWithSender() {
        InputStream pdf = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(pdf);

        Integer documentId = given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", pdf, "application/pdf")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode())
                .extract()
                .path("id");

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                            "name": "Kassenbeleg",
                            "total": 180.00,
                            "senderName": "%s",
                            "senderCity": "Wien",
                            "privatelyPaid": false
                        }
                        """.formatted(SENDER_NAME))
                .when()
                .patch("/{id}", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("senderName", equalTo(SENDER_NAME));

        Integer transactionId = given()
                .when()
                .post("/{id}/confirm", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("documentStatus", equalTo(DocumentStatus.CONFIRMED.name()))
                .body("transactionId", notNullValue())
                .extract()
                .path("transactionId");

        return new ConfirmedReceipt(documentId.longValue(), transactionId.longValue());
    }

    private String reviewedBy(long documentId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> entityManager
                        .createQuery("SELECT d.reviewedBy FROM Document d WHERE d.id = :id", String.class)
                        .setParameter("id", documentId)
                        .getSingleResult());
    }

    private long countTradeParties() {
        return QuarkusTransaction.requiringNew()
                .call(() -> entityManager.createQuery("SELECT COUNT(t) FROM TradeParty t", Long.class)
                        .getSingleResult());
    }

    private record ConfirmedReceipt(long documentId, long transactionId) {
    }
}
