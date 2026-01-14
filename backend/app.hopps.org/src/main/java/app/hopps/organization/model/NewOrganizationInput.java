package app.hopps.organization.model;

import app.hopps.member.domain.Member;
import app.hopps.organization.domain.Organization;
import jakarta.validation.constraints.NotNull;

public record NewOrganizationInput(@NotNull OwnerInput owner, @NotNull String newPassword,
        @NotNull OrganizationInput organization) {

    /**
     * Converts the organization input to an Organization entity.
     *
     * @return a new Organization entity populated with the input data
     */
    public Organization toOrganization() {
        Organization jpaOrg = new Organization();
        jpaOrg.setSlug(organization().slug());
        jpaOrg.setName(organization().name());
        jpaOrg.setType(organization().type());
        jpaOrg.setWebsite(organization().website());
        jpaOrg.setAddress(organization().address());
        jpaOrg.setProfilePicture(organization().profilePicture());
        return jpaOrg;
    }

    /**
     * Converts the owner input to a Member entity.
     *
     * @return a new Member entity populated with the owner data
     */
    public Member toOwner() {
        Member member = new Member();
        member.setEmail(owner().email());
        member.setFirstName(owner().firstName());
        member.setLastName(owner().lastName());
        return member;
    }
}
