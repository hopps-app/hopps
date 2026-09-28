package app.hopps.shared.tenancy;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

/**
 * Decides whether this installation serves many organizations (the hosted SaaS) or exactly one (a self-hosted
 * installation run by a single association).
 * <p>
 * This is a runtime property, so the same container image serves both cases:
 *
 * <pre>
 * HOPPS_TENANCY_MODE = single
 * </pre>
 *
 * In {@link Mode#SINGLE single} mode the organization is created once during the initial setup, sign-up is closed
 * afterwards, the SaaS-only admin API is switched off, and anyone who can log in but is not a member of that one
 * organization is told they have no access instead of being offered to create an organization of their own.
 */
@ConfigMapping(prefix = "hopps.tenancy")
public interface TenancyConfig {

    /**
     * @return whether this installation serves one organization or many. Defaults to {@link Mode#MULTI multi} so
     *         existing deployments keep behaving as before.
     */
    @WithDefault("multi")
    Mode mode();

    enum Mode {
        SINGLE,
        MULTI
    }
}
