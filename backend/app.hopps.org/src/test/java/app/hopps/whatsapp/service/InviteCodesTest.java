package app.hopps.whatsapp.service;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InviteCodesTest {

    @Test
    void generatesNormalizedCodes() {
        String code = InviteCodes.generate();

        assertEquals(10, code.length());
        assertEquals(Optional.of(code), InviteCodes.normalize(code));
        assertEquals(code.substring(0, 5) + "-" + code.substring(5), InviteCodes.format(code));
    }

    @Test
    void normalizesTypedInput() {
        assertEquals(Optional.of("ABCDE0GH1K"), InviteCodes.normalize(" abcde-oghik "));
        assertEquals(Optional.of("ABCDEFGH1V"), InviteCodes.normalize("ABCDE FGHLU"));
    }

    @Test
    void rejectsWhatCannotBeACode() {
        assertTrue(InviteCodes.normalize(null).isEmpty());
        assertTrue(InviteCodes.normalize("ABCDE-FGH").isEmpty());
        assertTrue(InviteCodes.normalize("ABCDE-FGH!K").isEmpty());
    }
}
