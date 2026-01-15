package app.hopps.shared.bootstrap;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

/**
 * Updates Organization entities with their root bommel references. This must run after both organizations and bommels
 * are loaded (order=40).
 */
@ApplicationScoped
public class OrganizationRootBommelLoader implements EntityDataLoader<TestdataConfig.OrganizationData> {

    private static final int ORDER = 40;

    @Override
    public int getOrder() {
        return ORDER;
    }

    @Override
    public String getName() {
        return "OrganizationRootBommel";
    }

    @Override
    public void loadData(TestdataConfig config, EntityManager entityManager) {
        if (config.getOrganizations() == null || config.getOrganizations().isEmpty()) {
            Log.info("No organization root bommels to update");
            return;
        }

        Log.info("Updating organization root bommel references");

        for (TestdataConfig.OrganizationData org : config.getOrganizations()) {
            if (org.getRootBommelId() != null) {
                String sql = """
                        UPDATE Organization SET rootBommel_id = :rootBommelId WHERE id = :id
                        """;

                entityManager.createNativeQuery(sql)
                        .setParameter("rootBommelId", org.getRootBommelId())
                        .setParameter("id", org.getId())
                        .executeUpdate();

                Log.debugf("Updated organization %d with rootBommel %d", org.getId(), org.getRootBommelId());
            }
        }
    }
}
