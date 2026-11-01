package app.hopps.uploadlink.api;

import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.UploadChannel;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.DocumentAnalysisService;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.uploadlink.domain.BommelUploadLink;
import app.hopps.uploadlink.service.UploadLinkService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;

/**
 * The public side of an upload link, called without any login.
 */
@QuarkusTest
class PublicUploadResourceTest {
    private static final long KIOSK = 24;

    @InjectMock
    DocumentAnalysisService analysisServiceMock;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    UploadLinkService uploadLinkService;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    DocumentRepository documentRepository;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        doNothing().when(analysisServiceMock).analyzeAsync(anyLong());
    }

    private String createLink(Instant expiresAt) {
        return QuarkusTransaction.requiringNew()
                .call(() -> uploadLinkService
                        .regenerate(bommelRepository.findById(KIOSK), expiresAt, "alice@example.test")
                        .getToken());
    }

    private static byte[] pdf(String marker) {
        return ("%PDF-1.4\n% " + marker + "\n").getBytes(StandardCharsets.US_ASCII);
    }

    @Test
    void describesTheLinkWithoutLogin() {
        String token = createLink(null);
        given().when()
                .get("/public/upload-links/{token}", token)
                .then()
                .statusCode(200)
                .body("organizationName", equalTo("Theatervereine Bühnefrei e.V."))
                .body("bommelName", equalTo("Kiosk"));
    }

    @Test
    void submittedReceiptLandsAtTheBommelWithTheGivenName() {
        String token = createLink(null);
        given().contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "beleg.pdf", pdf("submitted"), "application/pdf")
                .multiPart("name", "  Max Mustermann ")
                .multiPart("comment", "Getränke fürs Sommerfest", "text/plain; charset=UTF-8")
                .multiPart("privatelyPaid", "true")
                .when()
                .post("/public/upload-links/{token}", token)
                .then()
                .statusCode(201)
                .body("fileName", equalTo("beleg.pdf"));

        QuarkusTransaction.requiringNew().run(() -> {
            Document document = documentRepository.find("uploadChannel", UploadChannel.UPLOAD_LINK).singleResult();
            assertEquals(KIOSK, document.getBommel().id);
            assertEquals("Max Mustermann", document.getUploadedBy());
            assertEquals("Getränke fürs Sommerfest", document.getUploaderComment());
            assertTrue(document.isPrivatelyPaid());
            assertEquals(4L, document.getOrganization().getId());
        });
    }

    @Test
    void sameFileTwiceIsAConflict() {
        String token = createLink(null);
        byte[] file = pdf("twice");
        for (int expected : new int[] { 201, 409 }) {
            given().contentType(MediaType.MULTIPART_FORM_DATA)
                    .multiPart("file", "beleg.pdf", file, "application/pdf")
                    .multiPart("name", "Max")
                    .when()
                    .post("/public/upload-links/{token}", token)
                    .then()
                    .statusCode(expected);
        }
    }

    @Test
    void requiresAName() {
        String token = createLink(null);
        given().contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "beleg.pdf", pdf("noname"), "application/pdf")
                .multiPart("name", "   ")
                .when()
                .post("/public/upload-links/{token}", token)
                .then()
                .statusCode(400);
    }

    @Test
    void rejectsContentThatDoesNotMatchTheType() {
        String token = createLink(null);
        given().contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "beleg.png", "<script>".getBytes(StandardCharsets.US_ASCII), "image/png")
                .multiPart("name", "Max")
                .when()
                .post("/public/upload-links/{token}", token)
                .then()
                .statusCode(415);
    }

    @Test
    void unknownOrReplacedTokenIsNotFound() {
        String old = createLink(null);
        createLink(null);
        given().when().get("/public/upload-links/{token}", old).then().statusCode(404);
        given().contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "beleg.pdf", pdf("old"), "application/pdf")
                .multiPart("name", "Max")
                .when()
                .post("/public/upload-links/{token}", old)
                .then()
                .statusCode(404);
    }

    @Test
    void expiredLinkIsGone() {
        String token = createLink(Instant.now().plus(1, ChronoUnit.HOURS));
        QuarkusTransaction.requiringNew()
                .run(() -> BommelUploadLink.<BommelUploadLink> find("token", token)
                        .singleResult()
                        .setExpiresAt(Instant.now().minus(1, ChronoUnit.MINUTES)));

        given().when().get("/public/upload-links/{token}", token).then().statusCode(410);
        given().contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "beleg.pdf", pdf("expired"), "application/pdf")
                .multiPart("name", "Max")
                .when()
                .post("/public/upload-links/{token}", token)
                .then()
                .statusCode(410);
    }
}
