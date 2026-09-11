package app.hopps.shared.infrastructure.storage;

import io.quarkus.test.junit.QuarkusTestProfile;

import java.util.Map;

/**
 * Switches the application back to the S3 backend. The rest of the test suite runs on local storage, so this profile
 * also has to turn the LocalStack Dev Service back on.
 */
public class S3StorageTestProfile implements QuarkusTestProfile {

    @Override
    public Map<String, String> getConfigOverrides() {
        return Map.of(
                "hopps.storage.type", "s3",
                "quarkus.s3.devservices.enabled", "true");
    }
}
