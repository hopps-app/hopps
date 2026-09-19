package app.hopps.organization.service.authentik;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The fields of Authentik's {@code User} object that hopps actually needs. {@code pk} is the integer id used to address
 * the user in further API calls (recovery-email, delete); {@code uuid} is the stable id that ends up as the OIDC
 * {@code sub} claim (when the provider's Subject mode is set to "Based on the User's UUID") and is what gets persisted
 * as {@link app.hopps.member.domain.Member#getKeycloakId()}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AuthentikUser(long pk, String uuid, String username, String name, String email,
        @JsonProperty("is_active") boolean isActive) {
}
