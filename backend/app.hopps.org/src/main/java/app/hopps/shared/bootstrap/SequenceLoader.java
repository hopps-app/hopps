package app.hopps.shared.bootstrap;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

import java.util.Map;

/**
 * Updates database sequences to match the loaded testdata. This must run last (order=100) after all entity data is
 * loaded.
 */
@ApplicationScoped
public class SequenceLoader implements EntityDataLoader<Map.Entry<String, Long>> {

    private static final int ORDER = 100;

    @Override
    public int getOrder() {
        return ORDER;
    }

    @Override
    public String getName() {
        return "Sequence";
    }

    @Override
    public void loadData(TestdataConfig config, EntityManager entityManager) {
        if (config.getSequences() == null || config.getSequences().isEmpty()) {
            Log.info("No sequences to update");
            return;
        }

        Log.infof("Updating %d sequences", config.getSequences().size());

        for (Map.Entry<String, Long> entry : config.getSequences().entrySet()) {
            String sequenceName = entry.getKey();
            Long value = entry.getValue();

            String sql = String.format("SELECT setval('%s', %d, true)", sequenceName, value);

            entityManager.createNativeQuery(sql).getSingleResult();

            Log.debugf("Updated sequence %s to %d", sequenceName, value);
        }
    }
}
