package app.hopps.organization.service.authentik;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Response of {@code POST /core/users/{id}/recovery/}: the link in which the user sets a new password. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AuthentikLink(String link) {
}
