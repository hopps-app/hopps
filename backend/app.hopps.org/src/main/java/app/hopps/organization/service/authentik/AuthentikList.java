package app.hopps.organization.service.authentik;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** The {@code {pagination, results, autocomplete}} envelope every Authentik list endpoint responds with. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AuthentikList<T>(List<T> results) {
}
