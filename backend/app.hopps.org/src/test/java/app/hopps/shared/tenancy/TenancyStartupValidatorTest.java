package app.hopps.shared.tenancy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TenancyStartupValidatorTest {

    @Test
    @DisplayName("single-tenant mode accepts an empty database and exactly one organization")
    void singleAcceptsZeroOrOne() {
        assertDoesNotThrow(() -> TenancyStartupValidator.validate(TenancyConfig.Mode.SINGLE, 0));
        assertDoesNotThrow(() -> TenancyStartupValidator.validate(TenancyConfig.Mode.SINGLE, 1));
    }

    @Test
    @DisplayName("single-tenant mode refuses to start on a database with several organizations")
    void singleRefusesSeveral() {
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> TenancyStartupValidator.validate(TenancyConfig.Mode.SINGLE, 2));
        assertTrue(e.getMessage().contains("HOPPS_TENANCY_MODE=single"));
        assertTrue(e.getMessage().contains("2 active organizations"));
    }

    @Test
    @DisplayName("multi-tenant mode never complains")
    void multiAcceptsAnything() {
        assertDoesNotThrow(() -> TenancyStartupValidator.validate(TenancyConfig.Mode.MULTI, 0));
        assertDoesNotThrow(() -> TenancyStartupValidator.validate(TenancyConfig.Mode.MULTI, 25));
    }
}
