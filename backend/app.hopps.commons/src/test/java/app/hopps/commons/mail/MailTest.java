package app.hopps.commons.mail;

import nl.jqno.equalsverifier.EqualsVerifier;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MailTest {
    @Test
    void testEquals() {
        EqualsVerifier.forClass(Mail.class).verify();
    }

    @Test
    void testToString() {
        Mail mail = new Mail(new String[] { "info@hopps.de", "support@hopps.de" }, MailTemplates.TEMP, Map.of());

        String expected = "Mail{mailReceivers=[info@hopps.de, support@hopps.de], templateId=TEMP, variables={}}";

        String actual = mail.toString();

        assertEquals(expected, actual);
    }
}
