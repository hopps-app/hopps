package app.hopps.shared.bootstrap;

import io.quarkus.logging.Log;
import io.quarkus.runtime.LaunchMode;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Generic bootstrapper service that loads testdata from YAML files. This service only runs in dev and test modes (not
 * in production).
 * <p>
 * The bootstrapper discovers all {@link EntityDataLoader} implementations via CDI and executes them in order based on
 * their {@link EntityDataLoader#getOrder()} value.
 * <p>
 * Configuration:
 * <ul>
 * <li>{@code app.hopps.testdata.enabled} - Enable/disable testdata loading (default: true for dev/test)</li>
 * <li>{@code app.hopps.testdata.location} - Path to YAML file (default: testdata/testdata.yaml)</li>
 * </ul>
 */
@ApplicationScoped
public class TestdataBootstrapper {

    @Inject
    EntityManager entityManager;

    @Inject
    Instance<EntityDataLoader<?>> dataLoaders;

    @ConfigProperty(name = "app.hopps.testdata.enabled", defaultValue = "true")
    boolean testdataEnabled;

    @ConfigProperty(name = "app.hopps.testdata.location", defaultValue = "testdata/testdata.yaml")
    String testdataLocation;

    void onStart(@Observes StartupEvent event) {
        LaunchMode launchMode = LaunchMode.current();

        // Only run in dev or test mode
        if (launchMode == LaunchMode.NORMAL) {
            Log.info("Testdata bootstrapper disabled in production mode");
            return;
        }

        if (!testdataEnabled) {
            Log.info("Testdata bootstrapper disabled via configuration");
            return;
        }

        Log.infof("Testdata bootstrapper starting in %s mode", launchMode);
        loadTestdata();
    }

    /**
     * Loads testdata from the YAML configuration file. This method can be called from tests after Flyway clean/migrate
     * operations to restore the test data state.
     */
    @Transactional
    public void loadTestdata() {
        try {
            // Check if testdata already exists (idempotency check)
            Long orgCount = (Long) entityManager
                    .createQuery("SELECT COUNT(o) FROM Organization o")
                    .getSingleResult();
            if (orgCount > 0) {
                Log.info("Testdata already loaded (organizations exist), skipping");
                return;
            }

            Optional<TestdataConfig> configOpt = loadConfiguration();

            if (configOpt.isEmpty()) {
                Log.warn("No testdata configuration found, skipping");
                return;
            }

            TestdataConfig config = configOpt.get();

            // Get all loaders sorted by order
            List<EntityDataLoader<?>> sortedLoaders = dataLoaders.stream()
                    .sorted(Comparator.comparingInt(EntityDataLoader::getOrder))
                    .toList();

            Log.infof("Found %d data loaders", sortedLoaders.size());

            // Execute each loader in order
            for (EntityDataLoader<?> loader : sortedLoaders) {
                Log.infof("Executing loader: %s (order=%d)", loader.getName(), loader.getOrder());
                loader.loadData(config, entityManager);
            }

            // Flush changes
            entityManager.flush();

            Log.info("Testdata loading completed successfully");

        } catch (Exception e) {
            Log.errorf(e, "Failed to load testdata: %s", e.getMessage());
            throw new RuntimeException("Testdata loading failed", e);
        }
    }

    private Optional<TestdataConfig> loadConfiguration() {
        Log.infof("Loading testdata from: %s", testdataLocation);

        try (InputStream inputStream = Thread.currentThread()
                .getContextClassLoader()
                .getResourceAsStream(testdataLocation)) {

            if (inputStream == null) {
                Log.warnf("Testdata file not found: %s", testdataLocation);
                return Optional.empty();
            }

            Yaml yaml = new Yaml();
            TestdataConfig config = yaml.loadAs(inputStream, TestdataConfig.class);

            return Optional.ofNullable(config);

        } catch (Exception e) {
            Log.errorf(e, "Failed to parse testdata YAML: %s", e.getMessage());
            throw new RuntimeException("Failed to parse testdata YAML", e);
        }
    }
}
