package app.hopps.org.rest.model;

import jakarta.annotation.Nonnull;

public record InvitationConfirmation(@Nonnull MemberInput invitedMember, @Nonnull String newPassword) {

//    public Map<String, Object> toModel() {
//        Map<String, Object> parameters = new HashMap<>();
//
//        Organization jpaOrg = new Organization();
//        jpaOrg.setSlug(organization().slug());
//        jpaOrg.setName(organization().name());
//        jpaOrg.setType(organization().type());
//        jpaOrg.setWebsite(organization().website());
//        jpaOrg.setAddress(organization().address());
//        jpaOrg.setProfilePicture(organization().profilePicture());
//        parameters.put("organization", jpaOrg);
//
//        Member member = new Member();
//        member.setEmail(owner().email());
//        member.setFirstName(owner().firstName());
//        member.setLastName(owner().lastName());
//        parameters.put("owner", member);
//
//        parameters.put("newPassword", newPassword);
//
//        return parameters;
//    }
}
