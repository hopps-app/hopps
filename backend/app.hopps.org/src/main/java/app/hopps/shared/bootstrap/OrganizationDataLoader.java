package app.hopps.shared.bootstrap;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

/**
 * Loads Organization entities from testdata configuration. Organizations are loaded first (order=10) as they have no
 * dependencies on other testdata entities.
 */
@ApplicationScoped
public class OrganizationDataLoader implements EntityDataLoader<TestdataConfig.OrganizationData> {

    private static final int ORDER = 10;

    @Override
    public int getOrder() {
        return ORDER;
    }

    @Override
    public String getName() {
        return "Organization";
    }

    @Override
    public void loadData(TestdataConfig config, EntityManager entityManager) {
        if (config.getOrganizations() == null || config.getOrganizations().isEmpty()) {
            Log.info("No organizations to load");
            return;
        }

        Log.infof("Loading %d organizations", config.getOrganizations().size());

        for (TestdataConfig.OrganizationData org : config.getOrganizations()) {
            String sql = """
                    INSERT INTO Organization (id, type, slug, name, website, plz, city, street, number)
                    VALUES (:id, :type, :slug, :name, :website, :plz, :city, :street, :number)
                    """;

            entityManager.createNativeQuery(sql)
                    .setParameter("id", org.getId())
                    .setParameter("type", getTypeOrdinal(org.getType()))
                    .setParameter("slug", org.getSlug())
                    .setParameter("name", org.getName())
                    .setParameter("website", org.getWebsite())
                    .setParameter("plz", org.getAddress() != null ? org.getAddress().getPlz() : null)
                    .setParameter("city", org.getAddress() != null ? org.getAddress().getCity() : null)
                    .setParameter("street", org.getAddress() != null ? org.getAddress().getStreet() : null)
                    .setParameter("number", org.getAddress() != null ? org.getAddress().getNumber() : null)
                    .executeUpdate();

            Log.debugf("Loaded organization: %s (id=%d)", org.getName(), org.getId());
        }
    }

    private int getTypeOrdinal(String type) {
        return switch (type) {
            case "EINGETRAGENER_VEREIN" -> 0;
            default -> throw new IllegalArgumentException("Unknown organization type: " + type);
        };
    }
}
