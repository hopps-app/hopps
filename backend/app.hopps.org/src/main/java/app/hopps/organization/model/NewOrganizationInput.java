package app.hopps.organization.model;

import app.hopps.member.domain.Member;
import app.hopps.organization.domain.Organization;
import jakarta.validation.constraints.NotNull;

import java.util.HashMap;
import java.util.Map;

public record NewOrganizationInput(@NotNull OwnerInput owner, @NotNull String newPassword,
        @NotNull OrganizationInput organization) {

    public Map<String, Object> toModel() {
        Map<String, Object> parameters = new HashMap<>();

        Organization jpaOrg = new Organization();
        jpaOrg.setSlug(organization().slug());
        jpaOrg.setName(organization().name());
        jpaOrg.setType(organization().type());
        jpaOrg.setWebsite(organization().website());
        jpaOrg.setAddress(organization().address());
        jpaOrg.setProfilePicture(organization().profilePicture());
        parameters.put("organization", jpaOrg);

        Member member = new Member();
        member.setEmail(owner().email());
        member.setFirstName(owner().firstName());
        member.setLastName(owner().lastName());
        parameters.put("owner", member);

        parameters.put("newPassword", newPassword);

        return parameters;
    }
}
