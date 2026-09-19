package app.hopps.organization.service.authentik;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Request body for {@code POST /core/users/{id}/recovery/} (link only, {@code emailStage} null) and
 * {@code .../recovery_email/}. {@code emailStage} is the uuid of the Authentik "Email" stage that sends the mail;
 * {@code tokenDuration} how long the link stays valid, in Authentik's {@code seconds=259200} notation. Older Authentik
 * versions (e.g. 2024.12) ignore the body entirely and apply their own default validity.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthentikRecoveryRequest(@JsonProperty("email_stage") String emailStage,
        @JsonProperty("token_duration") String tokenDuration) {
}
