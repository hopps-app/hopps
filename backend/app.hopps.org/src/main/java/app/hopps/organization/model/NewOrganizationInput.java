package app.hopps.organization.model;

import app.hopps.member.domain.Member;
import app.hopps.organization.domain.Organization;
import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public record NewOrganizationInput(@NotNull OwnerInput owner, @NotNull String newPassword,
        @NotNull OrganizationInput organization,
        @Schema(description = "Payload of the solved ALTCHA challenge from GET /public/altcha/challenge, as the altcha widget produces it. Required unless spam protection is switched off (hopps.altcha.enabled=false).") String altcha) {

    /**
     * Converts the organization input to an Organization entity.
     *
     * @return a new Organization entity populated with the input data
     */
    public Organization toOrganization() {
        return organization().toOrganization();
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
