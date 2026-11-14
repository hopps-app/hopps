package app.hopps.whatsapp.api;

import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.UploadChannel;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.DocumentAnalysisService;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.shared.security.InternalApiFilter;
import app.hopps.whatsapp.service.InviteCodes;
import app.hopps.whatsapp.service.WhatsAppInviteService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.builder.MultiPartSpecBuilder;
import io.restassured.specification.RequestSpecification;
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
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;

/**
 * The internal WhatsApp API the chatbot calls, authenticated with the shared token instead of a login.
 */
@QuarkusTest
class InternalWhatsAppResourceTest {
    private static final long KIOSK = 24;
    private static final String PHONE = "4917612345678";
    private static final String TOKEN = "dev-internal-token";

    @InjectMock
    DocumentAnalysisService analysisServiceMock;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    WhatsAppInviteService inviteService;

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

    private static RequestSpecification internal() {
        return given().header(InternalApiFilter.HEADER, TOKEN);
    }

    private String createInvite(Instant expiresAt) {
        return QuarkusTransaction.requiringNew()
                .call(() -> InviteCodes.format(inviteService
                        .regenerate(bommelRepository.findById(KIOSK), expiresAt, "alice@example.test")
                        .getCode()));
    }

    private void join(String code) {
        internal().contentType(MediaType.APPLICATION_JSON)
                .body("{\"code\":\"" + code + "\",\"phoneNumber\":\"" + PHONE + "\",\"displayName\":\"Max\"}")
                .when()
                .post("/internal/whatsapp/join")
                .then()
                .statusCode(200);
    }

    @Test
    void rejectsCallsWithoutOrWithWrongToken() {
        given().when().get("/internal/whatsapp/contacts/{p}", PHONE).then().statusCode(401);
        given().header(InternalApiFilter.HEADER, "wrong")
                .when()
                .get("/internal/whatsapp/contacts/{p}", PHONE)
                .then()
                .statusCode(401);
    }

    @Test
    void joinConnectsNumberCaseAndSeparatorInsensitive() {
        String code = createInvite(null);

        internal().contentType(MediaType.APPLICATION_JSON)
                .body("{\"code\":\"" + code.toLowerCase().replace("-", " ") + "\",\"phoneNumber\":\"+" + PHONE
                        + "\",\"displayName\":\"Max\"}")
                .when()
                .post("/internal/whatsapp/join")
                .then()
                .statusCode(200)
                .body("bommelId", equalTo((int) KIOSK))
                .body("previousBommelName", nullValue());

        internal().when()
                .get("/internal/whatsapp/contacts/{p}", PHONE)
                .then()
                .statusCode(200)
                .body("bommelId", equalTo((int) KIOSK));
    }

    @Test
    void unknownOrExpiredCodeIsRejected() {
        internal().contentType(MediaType.APPLICATION_JSON)
                .body("{\"code\":\"ABCDE-FGHJK\",\"phoneNumber\":\"" + PHONE + "\"}")
                .when()
                .post("/internal/whatsapp/join")
                .then()
                .statusCode(404);

        String expired = createInvite(Instant.now().plus(1, ChronoUnit.SECONDS));
        QuarkusTransaction.requiringNew()
                .run(() -> inviteService.find(bommelRepository.findById(KIOSK))
                        .orElseThrow()
                        .setExpiresAt(Instant.now().minus(1, ChronoUnit.MINUTES)));
        internal().contentType(MediaType.APPLICATION_JSON)
                .body("{\"code\":\"" + expired + "\",\"phoneNumber\":\"" + PHONE + "\"}")
                .when()
                .post("/internal/whatsapp/join")
                .then()
                .statusCode(410);
    }

    @Test
    void unconnectedNumberIsNotFound() {
        internal().when().get("/internal/whatsapp/contacts/{p}", PHONE).then().statusCode(404);
        internal().multiPart("file", "beleg.pdf", "%PDF-1.4\n".getBytes(StandardCharsets.US_ASCII),
                "application/pdf")
                .when()
                .post("/internal/whatsapp/contacts/{p}/receipts", PHONE)
                .then()
                .statusCode(404);
    }

    @Test
    void filesReceiptIntoTheBommel() {
        join(createInvite(null));

        internal().multiPart("file", "beleg.pdf", "%PDF-1.4\n% whatsapp\n".getBytes(StandardCharsets.US_ASCII),
                "application/pdf")
                // RestAssured sends text parts as ISO-8859-1 unless told otherwise
                .multiPart(new MultiPartSpecBuilder("Getränke Sommerfest").controlName("caption")
                        .charset(StandardCharsets.UTF_8)
                        .build())
                .when()
                .post("/internal/whatsapp/contacts/{p}/receipts", PHONE)
                .then()
                .statusCode(201)
                .body("fileName", equalTo("beleg.pdf"))
                .body("bommelName", equalTo(bommelRepository.findById(KIOSK).getName()));

        Document document = QuarkusTransaction.requiringNew()
                .call(() -> documentRepository.find("uploadChannel", UploadChannel.WHATSAPP).firstResult());
        assertEquals("Max", document.getUploadedBy());
        assertEquals("Getränke Sommerfest", document.getUploaderComment());
        assertEquals(KIOSK, QuarkusTransaction.requiringNew()
                .call(() -> documentRepository.findById(document.getId()).getBommel().id));
    }

    @Test
    void disconnectStopsUploads() {
        join(createInvite(null));

        internal().when().delete("/internal/whatsapp/contacts/{p}", PHONE).then().statusCode(204);

        internal().when().get("/internal/whatsapp/contacts/{p}", PHONE).then().statusCode(404);
    }
}
