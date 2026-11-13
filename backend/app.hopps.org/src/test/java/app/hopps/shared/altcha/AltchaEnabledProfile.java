package app.hopps.shared.altcha;

import io.quarkus.test.junit.QuarkusTestProfile;

import java.util.Map;

/**
 * Switches the ALTCHA check on, which the test profile turns off, with challenges small enough to solve in a test.
 */
public class AltchaEnabledProfile implements QuarkusTestProfile {

    @Override
    public Map<String, String> getConfigOverrides() {
        return Map.of(
                "hopps.altcha.enabled", "true",
                "hopps.altcha.counter-min", "1",
                "hopps.altcha.counter-max", "20");
    }
}
