package app.hopps.shared.bootstrap;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

import java.util.List;

/**
 * Loads category groups (order=35, after the bommels they are assigned to) with their values and bommel assignments.
 * Value ids are handed out from {@link #VALUE_ID_BASE} upwards; the sequences are set by {@link SequenceLoader}.
 */
@ApplicationScoped
public class CategoryGroupDataLoader implements EntityDataLoader<TestdataConfig.CategoryGroupData> {

    private static final int ORDER = 35;
    private static final long VALUE_ID_BASE = 1;

    @Override
    public int getOrder() {
        return ORDER;
    }

    @Override
    public String getName() {
        return "CategoryGroup";
    }

    @Override
    public void loadData(TestdataConfig config, EntityManager entityManager) {
        if (config.getCategoryGroups() == null || config.getCategoryGroups().isEmpty()) {
            Log.info("No category groups to load");
            return;
        }

        Log.infof("Loading %d category groups", config.getCategoryGroups().size());

        long valueId = VALUE_ID_BASE;
        for (TestdataConfig.CategoryGroupData group : config.getCategoryGroups()) {
            entityManager.createNativeQuery("""
                    INSERT INTO category_group (id, organization_id, name, required)
                    VALUES (:id, :organizationId, :name, :required)
                    """)
                    .setParameter("id", group.getId())
                    .setParameter("organizationId", group.getOrganizationId())
                    .setParameter("name", group.getName())
                    .setParameter("required", group.isRequired())
                    .executeUpdate();

            List<String> values = group.getValues() != null ? group.getValues() : List.of();
            for (int i = 0; i < values.size(); i++) {
                entityManager.createNativeQuery("""
                        INSERT INTO category_group_value (id, category_group_id, value, sort_index)
                        VALUES (:id, :groupId, :value, :sortIndex)
                        """)
                        .setParameter("id", valueId++)
                        .setParameter("groupId", group.getId())
                        .setParameter("value", values.get(i))
                        .setParameter("sortIndex", i)
                        .executeUpdate();
            }

            for (Long bommelId : group.getBommelIds() != null ? group.getBommelIds() : List.<Long> of()) {
                entityManager.createNativeQuery("""
                        INSERT INTO category_group_bommel (category_group_id, bommel_id) VALUES (:groupId, :bommelId)
                        """)
                        .setParameter("groupId", group.getId())
                        .setParameter("bommelId", bommelId)
                        .executeUpdate();
            }

            Log.debugf("Loaded category group: %s (id=%d, %d values)", group.getName(), group.getId(), values.size());
        }
    }
}
