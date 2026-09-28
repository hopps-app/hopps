package app.hopps.shared.tenancy;

import io.quarkus.test.junit.QuarkusTestProfile;

import java.util.Map;

/**
 * Runs the application as a self-hosted, single-tenant installation. The shared testdata (three organizations) is
 * switched off because a single-tenant installation refuses to start with more than one — tests seed what they need.
 */
public class SingleTenantProfile implements QuarkusTestProfile {

    @Override
    public Map<String, String> getConfigOverrides() {
        return Map.of(
                "hopps.tenancy.mode", "single",
                "app.hopps.testdata.enabled", "false");
    }
}
