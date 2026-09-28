package app.hopps.organization.service;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.Role;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.NotFoundException;

@ApplicationScoped
@SuppressWarnings("java:S6813")
public class PersistMemberDelegate {

    @Inject
    MemberRepository memberRepository;

    @Inject
    OrganizationRepository organizationRepository;

    /**
     * Links an invited member to their organization and persists them. {@code Member} owns the {@code member_verein}
     * join table, so persisting the member is what writes the association.
     * <p>
     * A separate bean on purpose, mirroring {@link PersistOrganizationDelegate}: the Keycloak call in
     * {@link OrganizationMemberService} has to stay outside this transaction, and calling a {@code @Transactional}
     * method on {@code this} would not trigger the interceptor.
     * <p>
     * The organization the caller hands in was read before this transaction began and is therefore detached from its
     * session. So it is re-read here, inside the transaction, before the new membership is wired in.
     */
    @Transactional
    public void persistMember(@Valid Member member, Organization organization) {
        Organization attached = organizationRepository.findById(organization.getId());
        if (attached == null) {
            throw new NotFoundException("Organization " + organization.getId() + " no longer exists");
        }

        member.addOrganization(attached, Role.ADMIN);
        attached.addMember(member, Role.ADMIN);
        memberRepository.persist(member);
    }
}
