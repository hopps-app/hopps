package app.hopps.chatbot.org.service;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The org client against {@link FakeOrgInternalApi}: token header, JSON mapping, status codes and the multipart body.
 */
@QuarkusTest
class OrgGatewayTest {
    private static final String PHONE = "4917612345678";

    @Inject
    OrgGateway gateway;

    @BeforeEach
    void reset() {
        FakeOrgInternalApi.CONNECTED.clear();
        FakeOrgInternalApi.lastReceipt = null;
    }

    @Test
    void acceptMapsConnectionAndStatusCodes() {
        var accepted = gateway.accept(FakeOrgInternalApi.VALID_TOKEN, PHONE);
        assertEquals(OrgGateway.AnswerStatus.DONE, accepted.status());
        assertEquals("🍺 Kiosk", accepted.connection().bommelLabel());
        assertEquals("Testverein", accepted.connection().organizationName());

        assertEquals(OrgGateway.AnswerStatus.UNKNOWN_INVITATION, gateway.accept("other", PHONE).status());
        assertEquals(OrgGateway.AnswerStatus.EXPIRED,
                gateway.accept(FakeOrgInternalApi.EXPIRED_TOKEN, PHONE).status());
        assertEquals(OrgGateway.AnswerStatus.DONE, gateway.decline(FakeOrgInternalApi.VALID_TOKEN, PHONE));
        assertEquals(OrgGateway.AnswerStatus.UNKNOWN_INVITATION, gateway.decline("other", PHONE));
    }

    @Test
    void findConnectionIsEmptyForUnknownNumber() {
        assertTrue(gateway.findConnection(PHONE).isEmpty());
        gateway.accept(FakeOrgInternalApi.VALID_TOKEN, PHONE);
        assertEquals("Kiosk", gateway.findConnection(PHONE).orElseThrow().bommelName());
        gateway.disconnect(PHONE);
        assertTrue(gateway.findConnection(PHONE).isEmpty());
    }

    @Test
    void submitsFileWithNameTypeAndUtf8Caption() {
        gateway.accept(FakeOrgInternalApi.VALID_TOKEN, PHONE);
        byte[] pdf = "%PDF-1.4\n".getBytes(StandardCharsets.US_ASCII);

        var status = gateway.submitReceipt(PHONE, pdf, "rechnung.pdf", "application/pdf", "Getränke Sommerfest");

        assertEquals(OrgGateway.UploadStatus.FILED, status);
        var received = FakeOrgInternalApi.lastReceipt;
        assertEquals("rechnung.pdf", received.fileName());
        assertEquals("application/pdf", received.contentType());
        assertArrayEquals(pdf, received.content());
        assertEquals("Getränke Sommerfest", received.caption());

        assertEquals(OrgGateway.UploadStatus.DUPLICATE,
                gateway.submitReceipt(PHONE, pdf, "rechnung.pdf", "application/pdf", null));
        assertEquals(OrgGateway.UploadStatus.NOT_CONNECTED,
                gateway.submitReceipt("4930000000", pdf, "x.pdf", "application/pdf", null));
    }
}
