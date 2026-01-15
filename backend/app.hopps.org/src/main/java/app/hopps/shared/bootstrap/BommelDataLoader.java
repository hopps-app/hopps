package app.hopps.shared.bootstrap;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Loads Bommel entities from testdata configuration. Bommels are loaded third (order=30) after members, as they may
 * reference members as responsible persons. Bommels are sorted topologically to ensure parents are created before
 * children.
 */
@ApplicationScoped
public class BommelDataLoader implements EntityDataLoader<TestdataConfig.BommelData> {

    private static final int ORDER = 30;

    @Override
    public int getOrder() {
        return ORDER;
    }

    @Override
    public String getName() {
        return "Bommel";
    }

    @Override
    public void loadData(TestdataConfig config, EntityManager entityManager) {
        if (config.getBommels() == null || config.getBommels().isEmpty()) {
            Log.info("No bommels to load");
            return;
        }

        Log.infof("Loading %d bommels", config.getBommels().size());

        // Sort bommels topologically (parents before children)
        List<TestdataConfig.BommelData> sortedBommels = topologicalSort(config.getBommels());

        for (TestdataConfig.BommelData bommel : sortedBommels) {
            String sql = """
                    INSERT INTO Bommel (id, parent_id, name, emoji, responsibleMember_id)
                    VALUES (:id, :parentId, :name, :emoji, :responsibleMemberId)
                    """;

            entityManager.createNativeQuery(sql)
                    .setParameter("id", bommel.getId())
                    .setParameter("parentId", bommel.getParentId())
                    .setParameter("name", bommel.getName())
                    .setParameter("emoji", bommel.getEmoji())
                    .setParameter("responsibleMemberId", bommel.getResponsibleMemberId())
                    .executeUpdate();

            Log.debugf("Loaded bommel: %s (id=%d, parentId=%d)", bommel.getName(), bommel.getId(),
                    bommel.getParentId());
        }
    }

    /**
     * Sorts bommels so that parents come before their children. This ensures foreign key constraints are satisfied
     * during insertion.
     */
    private List<TestdataConfig.BommelData> topologicalSort(List<TestdataConfig.BommelData> bommels) {
        Map<Long, TestdataConfig.BommelData> bommelMap = new HashMap<>();
        Map<Long, List<Long>> children = new HashMap<>();
        List<TestdataConfig.BommelData> roots = new ArrayList<>();

        // Build lookup maps
        for (TestdataConfig.BommelData bommel : bommels) {
            bommelMap.put(bommel.getId(), bommel);
            if (bommel.getParentId() == null) {
                roots.add(bommel);
            } else {
                children.computeIfAbsent(bommel.getParentId(), k -> new ArrayList<>()).add(bommel.getId());
            }
        }

        // BFS traversal from roots
        List<TestdataConfig.BommelData> sorted = new ArrayList<>();
        List<TestdataConfig.BommelData> queue = new ArrayList<>(roots);

        while (!queue.isEmpty()) {
            TestdataConfig.BommelData current = queue.remove(0);
            sorted.add(current);

            List<Long> childIds = children.get(current.getId());
            if (childIds != null) {
                for (Long childId : childIds) {
                    queue.add(bommelMap.get(childId));
                }
            }
        }

        return sorted;
    }
}
