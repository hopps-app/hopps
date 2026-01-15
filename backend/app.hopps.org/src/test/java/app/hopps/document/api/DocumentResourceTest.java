package app.hopps.document.api;

import app.hopps.document.domain.AnalysisStatus;
import app.hopps.document.domain.DocumentType;
import app.hopps.document.service.DocumentAnalysisService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.s3.S3Client;

import java.io.InputStream;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;

@QuarkusTest
@TestSecurity(user = "alice@example.test")
@TestHTTPEndpoint(DocumentResource.class)
class DocumentResourceTest {
    /// ID of the root bommel from the test user's organisation
	/// User: alice@example.test.
	/// Org: slug=buehnefrei-ev, id=4.
	/// see V2.0.0__test_data.sql
    private static final long ROOT_BOMMEL_ID = 23;

    /// A child bommel under the root bommel (König der Löwen project)
    private static final long CHILD_BOMMEL_ID = 30;

    @InjectMock
    DocumentAnalysisService analysisServiceMock;

    @Inject
    Flyway flyway;

    @Inject
    S3Client s3Client;

    @ConfigProperty(name = "bucket.name")
    String bucketName;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();

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
                .multiPart("type", DocumentType.INVOICE.toString(), "text/plain")
                .multiPart("privatelyPaid", true, "text/plain")
                .multiPart("bommelId", CHILD_BOMMEL_ID, "text/plain")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body("id", notNullValue())
                .body("fileName", equalTo("ZUGFeRD.pdf"))
                .body("fileContentType", equalTo("application/pdf"))
                .body("bommelId", equalTo((int) CHILD_BOMMEL_ID))
                .body("documentType", equalTo("INVOICE"))
                .body("privatelyPaid", equalTo(true))
                .body("analysisStatus", equalTo(AnalysisStatus.PENDING.name()));
    }

    @Test
    void shouldUploadToRootBommelWhenNoBommelIdProvided() {
        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", zugferdInputStream, "application/pdf")
                .multiPart("type", DocumentType.INVOICE.toString(), "text/plain")
                .multiPart("privatelyPaid", true, "text/plain")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body("id", notNullValue())
                .body("bommelId", nullValue())
                .body("documentType", equalTo("INVOICE"));
    }

    @Test
    void shouldFailOnInvalidBommel() {
        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", zugferdInputStream, "application/pdf")
                .multiPart("type", DocumentType.INVOICE.toString(), "text/plain")
                .multiPart("privatelyPaid", true, "text/plain")
                .multiPart("bommelId", 999999999, "text/plain")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.BAD_REQUEST.getStatusCode());
    }

    @Test
    void shouldFailOnBommelFromAnotherOrganization() {
        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);

        // Bommel ID 2 belongs to gruenes-herz-ev, not buehnefrei-ev
        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", zugferdInputStream, "application/pdf")
                .multiPart("type", DocumentType.INVOICE.toString(), "text/plain")
                .multiPart("privatelyPaid", true, "text/plain")
                .multiPart("bommelId", 2, "text/plain")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.BAD_REQUEST.getStatusCode());
    }

    @Test
    void shouldFailOnUnsupportedMediaType() {
        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "test.txt", "Hello World", "text/plain")
                .multiPart("type", DocumentType.INVOICE.toString(), "text/plain")
                .multiPart("privatelyPaid", false, "text/plain")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.UNSUPPORTED_MEDIA_TYPE.getStatusCode());
    }

    @Test
    void shouldFailOnMissingDocumentType() {
        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", zugferdInputStream, "application/pdf")
                .multiPart("privatelyPaid", false, "text/plain")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.BAD_REQUEST.getStatusCode());
    }

    @Test
    void shouldGetDocumentById() {
        // First upload a document
        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);

        int documentId = given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", zugferdInputStream, "application/pdf")
                .multiPart("type", DocumentType.RECEIPT.toString(), "text/plain")
                .multiPart("privatelyPaid", false, "text/plain")
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
                .body("fileName", equalTo("ZUGFeRD.pdf"))
                .body("documentType", equalTo("RECEIPT"))
                .body("privatelyPaid", equalTo(false));
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
                .multiPart("type", DocumentType.INVOICE.toString(), "text/plain")
                .multiPart("privatelyPaid", false, "text/plain")
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
        // Upload two documents first
        InputStream file1 = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        InputStream file2 = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(file1);
        assertNotNull(file2);

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "doc1.pdf", file1, "application/pdf")
                .multiPart("type", DocumentType.INVOICE.toString(), "text/plain")
                .multiPart("privatelyPaid", false, "text/plain")
                .when()
                .post()
                .then()
                .statusCode(Response.Status.CREATED.getStatusCode());

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "doc2.pdf", file2, "application/pdf")
                .multiPart("type", DocumentType.RECEIPT.toString(), "text/plain")
                .multiPart("privatelyPaid", true, "text/plain")
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
    void shouldDeleteDocument() {
        // First upload a document
        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);

        int documentId = given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", zugferdInputStream, "application/pdf")
                .multiPart("type", DocumentType.INVOICE.toString(), "text/plain")
                .multiPart("privatelyPaid", false, "text/plain")
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
                .multiPart("type", DocumentType.INVOICE.toString(), "text/plain")
                .multiPart("privatelyPaid", false, "text/plain")
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
}
