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
    void joinMapsConnectionAndStatusCodes() {
        var joined = gateway.join("abcde-fghjk", PHONE, "Max");
        assertEquals(OrgGateway.JoinStatus.CONNECTED, joined.status());
        assertEquals("🍺 Kiosk", joined.connection().bommelLabel());
        assertEquals("Testverein", joined.connection().organizationName());

        assertEquals(OrgGateway.JoinStatus.UNKNOWN_CODE, gateway.join("AAAAA-AAAAA", PHONE, null).status());
        assertEquals(OrgGateway.JoinStatus.EXPIRED, gateway.join("ZZZZZ-ZZZZZ", PHONE, null).status());
    }

    @Test
    void findConnectionIsEmptyForUnknownNumber() {
        assertTrue(gateway.findConnection(PHONE).isEmpty());
        gateway.join("ABCDE-FGHJK", PHONE, null);
        assertEquals("Kiosk", gateway.findConnection(PHONE).orElseThrow().bommelName());
        gateway.disconnect(PHONE);
        assertTrue(gateway.findConnection(PHONE).isEmpty());
    }

    @Test
    void submitsFileWithNameTypeAndUtf8Caption() {
        gateway.join("ABCDE-FGHJK", PHONE, null);
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
