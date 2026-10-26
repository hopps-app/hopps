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
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

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
    EntityManager entityManager;

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
    void shouldAcceptFileNamesLongerThanTheColumn() {
        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);
        String fileName = "a".repeat(300) + ".pdf";

        // Document.fileName is varchar(255); the name is truncated instead of failing the insert after the file has
        // already been written to storage.
        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", fileName, zugferdInputStream, "application/pdf")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode())
                .body("fileName", hasLength(255))
                .body("fileName", endsWith(".pdf"));
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
                .contentType(MediaType.APPLICATION_JSON)
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

    @Test
    void shouldRejectConfirmWhenRequiredCategoryGroupHasNoValue() {
        long groupId = createRequiredCategoryGroup();
        long documentId = uploadReceiptOnBommel();

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .when()
                .post("/{id}/confirm", documentId)
                .then()
                .statusCode(Response.Status.BAD_REQUEST.getStatusCode());

        // The rejected confirmation must leave the receipt open for review.
        given()
                .when()
                .get("/{id}", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("documentStatus", not(equalTo(DocumentStatus.CONFIRMED.name())))
                .body("transactionId", nullValue());
        assertTrue(groupId > 0);
    }

    @Test
    void shouldStoreCategoryValuesOnTheTransactionWhenConfirming() {
        long groupId = createRequiredCategoryGroup();
        long documentId = uploadReceiptOnBommel();

        Integer transactionId = given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "categoryValues": { "%d": "KS-100" } }
                        """.formatted(groupId))
                .when()
                .post("/{id}/confirm", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("documentStatus", equalTo(DocumentStatus.CONFIRMED.name()))
                .extract()
                .path("transactionId");

        given()
                .basePath("/transactions")
                .when()
                .get("/{id}", transactionId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("categoryValues", hasSize(1))
                .body("categoryValues[0].groupId", equalTo((int) groupId))
                .body("categoryValues[0].value", equalTo("KS-100"));
    }

    @Test
    void shouldRejectConfirmWithACategoryValueOutsideTheGroup() {
        long groupId = createRequiredCategoryGroup();
        long documentId = uploadReceiptOnBommel();

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "categoryValues": { "%d": "does-not-exist" } }
                        """.formatted(groupId))
                .when()
                .post("/{id}/confirm", documentId)
                .then()
                .statusCode(Response.Status.BAD_REQUEST.getStatusCode());
    }

    /**
     * Creates a mandatory category group with one allowed value, assigned to bommel 24 (a child of the root bommel).
     */
    private long createRequiredCategoryGroup() {
        Integer id = given()
                .basePath("/category-groups")
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "name": "Kostenstelle", "required": true, "bommelIds": [24], "values": ["KS-100"] }
                        """)
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode())
                .extract()
                .path("id");
        return id.longValue();
    }

    /** Uploads a receipt and books it on bommel 24, so the category group created above applies to it. */
    private long uploadReceiptOnBommel() {
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
                        { "name": "Kassenbeleg", "total": 180.00, "senderName": "%s", "bommelId": 24, "privatelyPaid": false }
                        """
                        .formatted(SENDER_NAME))
                .when()
                .patch("/{id}", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode());
        return documentId.longValue();
    }

    // ─── Splitting a document into several transactions (PUT /documents/{id}/transactions) ───

    @Test
    void shouldSplitDocumentIntoDraftTransactionsAndConfirmIt() {
        long documentId = uploadReceiptWithTotal("700.00");

        List<Integer> ids = given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": true, "parts": [
                            { "name": "Bier", "amount": 500.00, "bommelId": 24 },
                            { "name": "Pfand", "amount": 200.00, "bommelId": 24 } ] }
                        """)
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("$", hasSize(2))
                .body("[0].name", equalTo("Bier"))
                // INCOMING (the default direction) is an expense: the part amounts are negative.
                .body("[0].total", equalTo(-500.0f))
                .body("[0].status", equalTo("DRAFT"))
                .body("[0].bommelId", equalTo(24))
                .body("[0].documentId", equalTo((int) documentId))
                .body("[0].splitIndex", equalTo(0))
                .body("[0].splitCount", equalTo(2))
                .body("[1].name", equalTo("Pfand"))
                .body("[1].total", equalTo(-200.0f))
                .body("[1].splitIndex", equalTo(1))
                .body("[1].splitCount", equalTo(2))
                .extract()
                .path("id");

        // The document is confirmed and lists both parts in order; transactionId keeps pointing at the first one.
        given()
                .when()
                .get("/{id}", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("documentStatus", equalTo(DocumentStatus.CONFIRMED.name()))
                .body("transactionIds", equalTo(ids))
                .body("transactionId", equalTo(ids.get(0)));

        given()
                .when()
                .get("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("id", equalTo(ids))
                .body("[1].splitCount", equalTo(2));

        // The transaction endpoints know the position as well.
        given()
                .basePath("/transactions")
                .when()
                .get("/{id}", ids.get(1))
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("splitIndex", equalTo(1))
                .body("splitCount", equalTo(2));
    }

    @Test
    void shouldSaveSplitAsDraftWithoutEnforcingCompleteness() {
        long documentId = uploadReceiptWithTotal("700.00");

        // Incomplete on purpose: no bommels and the parts cover only part of the total.
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": false, "parts": [ { "amount": 100.00 }, { "amount": 50.00 } ] }
                        """)
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("$", hasSize(2))
                .body("[0].name", equalTo("Teil 1"))
                .body("[0].bommelId", nullValue())
                .body("[1].name", equalTo("Teil 2"));

        given()
                .when()
                .get("/{id}", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("documentStatus", not(equalTo(DocumentStatus.CONFIRMED.name())))
                .body("transactionIds", hasSize(2));
    }

    @Test
    void shouldAllowPartsBelowTheDocumentTotalWhenFinalizing() {
        long documentId = uploadReceiptWithTotal("700.00");

        // A receipt may contain a private share that is not booked, so the parts may add up to less than the total.
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": true, "parts": [ { "amount": 500.00, "bommelId": 24 } ] }
                        """)
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("$", hasSize(1))
                // A single part is not a split: no position.
                .body("[0].splitIndex", nullValue())
                .body("[0].splitCount", nullValue())
                // One part takes the document name.
                .body("[0].name", equalTo("Getränke Sommerfest"));
    }

    @Test
    void shouldRejectFinalizeWhenPartsExceedTheDocumentTotal() {
        long documentId = uploadReceiptWithTotal("700.00");

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": true, "parts": [
                            { "amount": 500.00, "bommelId": 24 }, { "amount": 300.00, "bommelId": 24 } ] }
                        """)
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.BAD_REQUEST.getStatusCode());

        // Nothing was booked.
        given()
                .when()
                .get("/{id}", documentId)
                .then()
                .body("documentStatus", not(equalTo(DocumentStatus.CONFIRMED.name())))
                .body("transactionIds", hasSize(0));
    }

    @Test
    void shouldRejectFinalizeWhenAPartHasNoBommelOrANonPositiveAmount() {
        long documentId = uploadReceiptWithTotal("700.00");

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": true, "parts": [ { "amount": 500.00, "bommelId": 24 }, { "amount": 200.00 } ] }
                        """)
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.BAD_REQUEST.getStatusCode());

        // A part without an amount is fine in a draft (the user fills it in later) but blocks confirming.
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": false, "parts": [ { "amount": 0, "bommelId": 24 } ] }
                        """)
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode());
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": true, "parts": [ { "amount": 0, "bommelId": 24 } ] }
                        """)
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.BAD_REQUEST.getStatusCode());
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": false, "parts": [ { "amount": -5, "bommelId": 24 } ] }
                        """)
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.BAD_REQUEST.getStatusCode());
    }

    @Test
    void shouldUpdateListedPartsInPlaceAndDeleteUnlistedOnes() {
        long documentId = uploadReceiptWithTotal("700.00");
        List<Integer> ids = splitAsDraft(documentId);

        // Keep the first part (new amount), drop the second, add a third.
        List<Integer> after = given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": true, "parts": [
                            { "id": %d, "name": "Bier", "amount": 400.00, "bommelId": 24 },
                            { "name": "Kühlmiete", "amount": 300.00, "bommelId": 24 } ] }
                        """.formatted(ids.get(0)))
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("$", hasSize(2))
                .body("[0].id", equalTo(ids.get(0)))
                .body("[0].total", equalTo(-400.0f))
                .body("[1].id", not(equalTo(ids.get(1))))
                .body("[1].name", equalTo("Kühlmiete"))
                .extract()
                .path("id");

        // The dropped part is gone, the kept one survived with its id.
        given()
                .basePath("/transactions")
                .when()
                .get("/{id}", ids.get(1))
                .then()
                .statusCode(Response.Status.NOT_FOUND.getStatusCode());
        given()
                .basePath("/transactions")
                .when()
                .get("/{id}", after.get(0))
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("total", equalTo(-400.0f));
    }

    @Test
    void shouldAdoptASenderAddedAfterTheDraftWhenFinalizing() {
        // Draft first, without a sender on the receipt ...
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
                        { "name": "Getränke", "total": 700.00, "bommelId": 24, "privatelyPaid": false }
                        """)
                .when()
                .patch("/{id}", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode());
        List<Integer> ids = splitAsDraft(documentId);

        // ... then the sender is added to the receipt and the split is finalized: the parts pick it up.
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "senderName": "%s", "privatelyPaid": false }
                        """.formatted(SENDER_NAME))
                .when()
                .patch("/{id}", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode());

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": true, "parts": [
                            { "id": %d, "amount": 500.00, "bommelId": 24 }, { "id": %d, "amount": 200.00, "bommelId": 24 } ] }
                        """
                        .formatted(ids.get(0), ids.get(1)))
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("[0].senderName", equalTo(SENDER_NAME))
                .body("[1].senderName", equalTo(SENDER_NAME));
    }

    @Test
    void shouldRejectChangingOrRemovingAConfirmedPart() {
        long documentId = uploadReceiptWithTotal("700.00");
        List<Integer> ids = splitAsDraft(documentId);
        markTransactionConfirmed(ids.get(0));

        // Removing the confirmed part (only the second is listed) ...
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": false, "parts": [ { "id": %d, "amount": 700.00 } ] }
                        """.formatted(ids.get(1)))
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.CONFLICT.getStatusCode());

        // ... and changing it are both refused.
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": false, "parts": [
                            { "id": %d, "amount": 100.00 }, { "id": %d, "amount": 200.00 } ] }
                        """.formatted(ids.get(0), ids.get(1)))
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.CONFLICT.getStatusCode());
    }

    @Test
    void shouldRequireMandatoryCategoryGroupsPerPartWhenFinalizing() {
        long groupId = createRequiredCategoryGroup();
        long documentId = uploadReceiptWithTotal("700.00");

        // Both parts sit on bommel 24, which carries the mandatory group; the second part has no value for it.
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": true, "parts": [
                            { "amount": 500.00, "bommelId": 24, "categoryValues": { "%d": "KS-100" } },
                            { "amount": 200.00, "bommelId": 24 } ] }
                        """.formatted(groupId))
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.BAD_REQUEST.getStatusCode());

        // The same split as a draft is fine, and the value is stored on the part that has one.
        List<Integer> ids = given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": false, "parts": [
                            { "amount": 500.00, "bommelId": 24, "categoryValues": { "%d": "KS-100" } },
                            { "amount": 200.00, "bommelId": 24 } ] }
                        """.formatted(groupId))
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("[0].categoryValues", hasSize(1))
                .body("[0].categoryValues[0].value", equalTo("KS-100"))
                .body("[1].categoryValues", hasSize(0))
                .extract()
                .path("id");
        assertEquals(2, ids.size());
    }

    @Test
    void shouldKeepASplitDocumentConfirmedWhileOtherPartsRemain() {
        long documentId = uploadReceiptWithTotal("700.00");
        List<Integer> ids = splitAsDraft(documentId, true);

        given()
                .basePath("/transactions")
                .when()
                .delete("/{id}", ids.get(0))
                .then()
                .statusCode(Response.Status.NO_CONTENT.getStatusCode());

        given()
                .when()
                .get("/{id}", documentId)
                .then()
                .body("documentStatus", equalTo(DocumentStatus.CONFIRMED.name()))
                .body("transactionIds", equalTo(List.of(ids.get(1))));

        // Deleting the last part sends the document back to review, as for a single transaction.
        given()
                .basePath("/transactions")
                .when()
                .delete("/{id}", ids.get(1))
                .then()
                .statusCode(Response.Status.NO_CONTENT.getStatusCode());

        given()
                .when()
                .get("/{id}", documentId)
                .then()
                .body("documentStatus", equalTo(DocumentStatus.ANALYZED.name()))
                .body("transactionIds", hasSize(0));
    }

    @Test
    void shouldDeleteAllPartsWithTheDocument() {
        long documentId = uploadReceiptWithTotal("700.00");
        List<Integer> ids = splitAsDraft(documentId, true);

        given()
                .when()
                .delete("/{id}", documentId)
                .then()
                .statusCode(Response.Status.NO_CONTENT.getStatusCode());

        for (Integer id : ids) {
            given()
                    .basePath("/transactions")
                    .when()
                    .get("/{id}", id)
                    .then()
                    .statusCode(Response.Status.NOT_FOUND.getStatusCode());
        }
    }

    @Test
    void shouldListTheSingleTransactionOfAClassicallyConfirmedReceipt() {
        ConfirmedReceipt receipt = uploadAndConfirmWithSender();

        given()
                .when()
                .get("/{id}", receipt.documentId())
                .then()
                .body("transactionIds", equalTo(List.of((int) receipt.transactionId())));

        given()
                .when()
                .get("/{id}/transactions", receipt.documentId())
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("$", hasSize(1))
                .body("[0].id", equalTo((int) receipt.transactionId()))
                .body("[0].splitCount", nullValue());
    }

    @Test
    void shouldReturnReceiptToReviewWhenTheAmountOfItsTransactionIsChanged() {
        ConfirmedReceipt receipt = uploadAndConfirmWithSender();

        // Same amount (sign and scale aside) or other fields: receipt and booking still agree.
        patchTransaction(receipt.transactionId(), "{ \"name\": \"Kassenbeleg Wien\", \"total\": -180.0 }");
        assertDocumentStatus(receipt.documentId(), DocumentStatus.CONFIRMED);

        // Raised by hand: the receipt (180,00) no longer matches the booking (200,00) and goes back to review.
        patchTransaction(receipt.transactionId(), "{ \"total\": -200.00 }");
        assertDocumentStatus(receipt.documentId(), DocumentStatus.ANALYZED);
        assertNull(reviewedBy(receipt.documentId()), "reviewedBy should be cleared when a receipt returns to review");

        // The receipt itself is the printed original and is not adjusted.
        given()
                .when()
                .get("/{id}", receipt.documentId())
                .then()
                .body("total", equalTo(180.0f));
    }

    @Test
    void shouldReturnASplitReceiptToReviewWhenAPartIsLoweredBelowAnExactMatch() {
        long documentId = uploadReceiptWithTotal("700.00");
        List<Integer> ids = splitAsDraft(documentId, true);

        // 500 + 200 matched the receipt exactly; lowering a part leaves 50,00 unaccounted for.
        patchTransaction(ids.get(1), "{ \"total\": -150.00 }");
        assertDocumentStatus(documentId, DocumentStatus.ANALYZED);
    }

    @Test
    void shouldKeepAPrivateShareSplitConfirmedUntilThePartsExceedTheReceipt() {
        long documentId = uploadReceiptWithTotal("700.00");
        Integer partId = given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": true, "parts": [
                            { "amount": 500.00, "bommelId": 24 }, { "amount": 100.00, "bommelId": 24 } ] }
                        """)
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .extract()
                .path("[1].id");

        // 650 of 700: still a private share, as before.
        patchTransaction(partId, "{ \"total\": -150.00 }");
        assertDocumentStatus(documentId, DocumentStatus.CONFIRMED);

        // 750 of 700: more booked than the receipt shows.
        patchTransaction(partId, "{ \"total\": -250.00 }");
        assertDocumentStatus(documentId, DocumentStatus.ANALYZED);
    }

    private void patchTransaction(long transactionId, String body) {
        given()
                .basePath("/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .when()
                .patch("/{id}", transactionId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode());
    }

    private void assertDocumentStatus(long documentId, DocumentStatus status) {
        given()
                .when()
                .get("/{id}", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("documentStatus", equalTo(status.name()));
    }

    /** Uploads a receipt with the given total, booked on bommel 24 with a sender. */
    private long uploadReceiptWithTotal(String total) {
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
                        { "name": "Getränke Sommerfest", "total": %s, "senderName": "%s", "bommelId": 24, "privatelyPaid": false }
                        """
                        .formatted(total, SENDER_NAME))
                .when()
                .patch("/{id}", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode());
        return documentId.longValue();
    }

    private List<Integer> splitAsDraft(long documentId) {
        return splitAsDraft(documentId, false);
    }

    /** Splits the document into 500 + 200 on bommel 24 and returns the two transaction ids. */
    private List<Integer> splitAsDraft(long documentId, boolean finalize) {
        return given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        { "confirmDocument": %b, "parts": [
                            { "name": "Bier", "amount": 500.00, "bommelId": 24 },
                            { "name": "Pfand", "amount": 200.00, "bommelId": 24 } ] }
                        """.formatted(finalize))
                .when()
                .put("/{id}/transactions", documentId)
                .then()
                .statusCode(Response.Status.OK.getStatusCode())
                .body("$", hasSize(2))
                .extract()
                .path("id");
    }

    /** Confirms a transaction directly in the database, bypassing the bank-coverage gate of the confirm endpoint. */
    private void markTransactionConfirmed(long transactionId) {
        QuarkusTransaction.requiringNew()
                .run(() -> entityManager
                        .createNativeQuery("update transaction set status = 'CONFIRMED' where id = :id")
                        .setParameter("id", transactionId)
                        .executeUpdate());
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
                .contentType(MediaType.APPLICATION_JSON)
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
