package app.hopps.shared.bootstrap;

import jakarta.persistence.EntityManager;

/**
 * Interface for entity-specific data loaders. Implementations handle loading data for specific entity types from the
 * testdata configuration.
 *
 * @param <T>
 *            The data type from TestdataConfig that this loader handles
 */
public interface EntityDataLoader<T> {

    /**
     * Returns the order in which this loader should be executed. Lower values are executed first. This is important for
     * entities with foreign key dependencies.
     *
     * @return the execution order (e.g., 10 for organizations, 20 for members, 30 for bommels)
     */
    int getOrder();

    /**
     * Returns the name of this loader for logging purposes.
     *
     * @return the loader name (e.g., "Organization", "Member", "Bommel")
     */
    String getName();

    /**
     * Loads the entity data using native SQL for explicit ID assignment.
     *
     * @param config
     *            the testdata configuration
     * @param entityManager
     *            the entity manager for executing queries
     */
    void loadData(TestdataConfig config, EntityManager entityManager);
}
