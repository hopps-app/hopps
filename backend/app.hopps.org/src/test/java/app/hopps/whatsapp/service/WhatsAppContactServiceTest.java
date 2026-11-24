package app.hopps.whatsapp.service;

import jakarta.ws.rs.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class WhatsAppContactServiceTest {

    @Test
    void normalizesInternationalFormats() {
        assertEquals("4917612345678", WhatsAppContactService.normalizePhoneNumber("+49 176 1234-5678"));
        assertEquals("4917612345678", WhatsAppContactService.normalizePhoneNumber("0049 176 12345678"));
        assertEquals("4917612345678", WhatsAppContactService.normalizePhoneNumber("4917612345678"));
    }

    @Test
    void rejectsNationalAndImplausibleNumbers() {
        assertThrows(BadRequestException.class, () -> WhatsAppContactService.normalizePhoneNumber("0176 12345678"));
        assertThrows(BadRequestException.class, () -> WhatsAppContactService.normalizePhoneNumber("+49 176"));
        assertThrows(BadRequestException.class, () -> WhatsAppContactService.normalizePhoneNumber(null));
    }
}
