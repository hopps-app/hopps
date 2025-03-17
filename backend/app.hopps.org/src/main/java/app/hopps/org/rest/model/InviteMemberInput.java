package app.hopps.org.rest.model;


import app.hopps.org.jpa.Member;
import app.hopps.org.jpa.Organization;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;

import java.util.HashMap;
import java.util.Map;

public record InviteMemberInput(@Email @NotNull String email) {
    public Map<String, Object> toModel(String slug) {
        Map<String, Object> parameters = new HashMap<>();

        parameters.put("email", email);
        parameters.put("slug", slug);

        return parameters;
    }
}
