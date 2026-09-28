package app.hopps.organization.service.authentik;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.core.MultivaluedMap;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.ext.ClientHeadersFactory;

import java.util.Optional;

/** Authenticates every {@link AuthentikApi} call with the configured service-account API token. */
@ApplicationScoped
public class AuthentikAuthHeadersFactory implements ClientHeadersFactory {

    // Optional so Keycloak deployments, which never call Authentik, start without it.
    @ConfigProperty(name = "app.hopps.org.auth.authentik.api-token")
    Optional<String> apiToken;

    @Override
    public MultivaluedMap<String, String> update(MultivaluedMap<String, String> incomingHeaders,
            MultivaluedMap<String, String> clientOutgoingHeaders) {
        String token = apiToken.orElseThrow(() -> new IllegalStateException(
                "app.hopps.org.auth.authentik.api-token must be set when app.hopps.org.auth.provider=authentik"));
        clientOutgoingHeaders.add("Authorization", "Bearer " + token);
        return clientOutgoingHeaders;
    }
}
