package app.hopps.whatsapp.api;

import app.hopps.bommel.repository.BommelRepository;
import app.hopps.document.domain.Document;
import app.hopps.document.domain.UploadChannel;
import app.hopps.document.repository.DocumentRepository;
import app.hopps.document.service.DocumentAnalysisService;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.shared.security.InternalApiFilter;
import app.hopps.whatsapp.client.ChatbotClient;
import app.hopps.whatsapp.domain.WhatsAppContact;
import app.hopps.whatsapp.repository.WhatsAppContactRepository;
import app.hopps.whatsapp.service.WhatsAppContactService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.builder.MultiPartSpecBuilder;
import io.restassured.specification.RequestSpecification;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
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
    private static final long WORKSHOPS = 26;
    private static final String PHONE = "4917612345678";
    private static final String TOKEN = "dev-internal-token";

    @InjectMock
    DocumentAnalysisService analysisServiceMock;

    @InjectMock
    @RestClient
    ChatbotClient chatbotClient;

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    WhatsAppContactService contactService;

    @Inject
    WhatsAppContactRepository contactRepository;

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

    /** Invites PHONE to the bommel and returns the token of the invitation's buttons. */
    private String invite(long bommelId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> contactService
                        .invite(bommelRepository.findById(bommelId), "Anna", "+" + PHONE, "Alice", "alice")
                        .getInvitationToken());
    }

    private io.restassured.response.ValidatableResponse answer(String token, String action, String phone) {
        return internal().contentType(MediaType.APPLICATION_JSON)
                .body("{\"phoneNumber\":\"" + phone + "\"}")
                .when()
                .post("/internal/whatsapp/invitations/{t}/" + action, token)
                .then();
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
    void acceptConnectsNumber() {
        String token = invite(KIOSK);
        internal().when().get("/internal/whatsapp/contacts/{p}", PHONE).then().statusCode(404);

        answer(token, "accept", PHONE).statusCode(200)
                .body("bommelId", equalTo((int) KIOSK))
                .body("previousBommelName", nullValue());

        internal().when()
                .get("/internal/whatsapp/contacts/{p}", PHONE)
                .then()
                .statusCode(200)
                .body("bommelId", equalTo((int) KIOSK));
        // pressing Accept twice is harmless
        answer(token, "accept", PHONE).statusCode(200);
    }

    @Test
    void acceptingAnotherBommelMovesTheNumber() {
        answer(invite(KIOSK), "accept", PHONE).statusCode(200);

        answer(invite(WORKSHOPS), "accept", PHONE).statusCode(200)
                .body("bommelId", equalTo((int) WORKSHOPS))
                .body("previousBommelName", equalTo(bommelRepository.findById(KIOSK).getName()));

        internal().when()
                .get("/internal/whatsapp/contacts/{p}", PHONE)
                .then()
                .body("bommelId", equalTo((int) WORKSHOPS));
    }

    @Test
    void answerFromAnotherNumberOrWithOldTokenIsRejected() {
        String first = invite(KIOSK);
        answer(first, "accept", "4930111111111").statusCode(404);

        invite(KIOSK); // resend replaces the token
        answer(first, "accept", PHONE).statusCode(404);
    }

    @Test
    void expiredInvitationIsGone() {
        String token = invite(KIOSK);
        QuarkusTransaction.requiringNew().run(() -> {
            WhatsAppContact contact = contactRepository.findByInvitationToken(token).orElseThrow();
            contact.setInvitedAt(contact.getInvitedAt().minus(31, ChronoUnit.DAYS));
        });

        answer(token, "accept", PHONE).statusCode(410);
    }

    @Test
    void declineMarksContact() {
        String token = invite(KIOSK);

        answer(token, "decline", PHONE).statusCode(204);

        assertEquals("DECLINED", QuarkusTransaction.requiringNew()
                .call(() -> contactRepository.findByInvitationToken(token).orElseThrow().getStatus().name()));
        internal().when().get("/internal/whatsapp/contacts/{p}", PHONE).then().statusCode(404);
    }

    @Test
    void receiptOnlyFromConnectedNumber() {
        invite(KIOSK);
        internal().multiPart("file", "beleg.pdf", "%PDF-1.4\n".getBytes(StandardCharsets.US_ASCII),
                "application/pdf")
                .when()
                .post("/internal/whatsapp/contacts/{p}/receipts", PHONE)
                .then()
                .statusCode(404);
    }

    @Test
    void filesReceiptIntoTheBommel() {
        answer(invite(KIOSK), "accept", PHONE).statusCode(200);

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
                .body("fileName", equalTo("beleg.pdf"));

        Document document = QuarkusTransaction.requiringNew()
                .call(() -> documentRepository.find("uploadChannel", UploadChannel.WHATSAPP).firstResult());
        assertEquals("Anna", document.getUploadedBy());
        assertEquals("Getränke Sommerfest", document.getUploaderComment());
        assertEquals(KIOSK, QuarkusTransaction.requiringNew()
                .call(() -> documentRepository.findById(document.getId()).getBommel().id));
    }

    @Test
    void disconnectStopsUploads() {
        answer(invite(KIOSK), "accept", PHONE).statusCode(200);

        internal().when().delete("/internal/whatsapp/contacts/{p}", PHONE).then().statusCode(204);

        internal().when().get("/internal/whatsapp/contacts/{p}", PHONE).then().statusCode(404);
    }
}
