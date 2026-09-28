package app.hopps.shared.tenancy;

import app.hopps.organization.repository.OrganizationRepository;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Refuses to start a single-tenant installation on a database that holds more than one organization. That state can
 * only come from pointing a multi-tenant database at {@code HOPPS_TENANCY_MODE=single}, and silently picking one of the
 * organizations as "the" one would be worse than a clear failure.
 */
@ApplicationScoped
public class TenancyStartupValidator {

    private static final Logger LOG = LoggerFactory.getLogger(TenancyStartupValidator.class);

    @Inject
    TenancyConfig config;

    @Inject
    OrganizationRepository organizationRepository;

    void onStart(@Observes StartupEvent event) {
        long organizations = organizationRepository.count();
        validate(config.mode(), organizations);
        LOG.info("Tenancy mode: {} ({} active organization(s))", config.mode(), organizations);
    }

    /**
     * @throws IllegalStateException
     *             when the mode is {@link TenancyConfig.Mode#SINGLE} and the database holds more than one active
     *             organization
     */
    static void validate(TenancyConfig.Mode mode, long activeOrganizations) {
        if (mode == TenancyConfig.Mode.SINGLE && activeOrganizations > 1) {
            throw new IllegalStateException("HOPPS_TENANCY_MODE=single, but the database holds " + activeOrganizations
                    + " active organizations. A single-tenant installation must have at most one. Either switch back to"
                    + " HOPPS_TENANCY_MODE=multi or remove the surplus organizations first.");
        }
    }
}
