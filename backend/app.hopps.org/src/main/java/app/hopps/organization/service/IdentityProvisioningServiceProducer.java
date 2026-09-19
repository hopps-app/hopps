package app.hopps.organization.service;

import app.hopps.organization.service.authentik.AuthentikIdentityProvisioningService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Picks the {@link IdentityProvisioningService} named by {@code app.hopps.org.auth.provider} at runtime, so one image
 * serves both Keycloak and Authentik deployments. The implementations are {@code @Typed} to their own class, which
 * leaves this producer as the only bean of the interface type; otherwise every {@code @Inject
 * IdentityProvisioningService} would be ambiguous ({@code @LookupIfProperty} only applies to {@code Instance} lookups).
 */
@ApplicationScoped
public class IdentityProvisioningServiceProducer {

    @ConfigProperty(name = "app.hopps.org.auth.provider")
    String provider;

    @Inject
    Instance<KeycloakIdentityProvisioningService> keycloak;

    @Inject
    Instance<AuthentikIdentityProvisioningService> authentik;

    @Produces
    @ApplicationScoped
    IdentityProvisioningService identityProvisioningService() {
        return switch (provider) {
            case "keycloak" -> keycloak.get();
            case "authentik" -> authentik.get();
            default -> throw new IllegalStateException(
                    "Unknown app.hopps.org.auth.provider '" + provider + "', expected 'keycloak' or 'authentik'");
        };
    }
}
