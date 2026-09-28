package app.hopps.organization.service.authentik;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Request body for {@code POST /core/users/}. */
public record AuthentikUserRequest(String username, String name, String email,
        @JsonProperty("is_active") boolean isActive) {
}
