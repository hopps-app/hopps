package app.hopps.org.delegates;

import app.hopps.org.jpa.Bommel;
import app.hopps.org.jpa.BommelRepository;
import app.hopps.org.jpa.Member;
import app.hopps.org.jpa.MemberRepository;
import app.hopps.org.jpa.Organization;
import app.hopps.org.jpa.OrganizationRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;

@ApplicationScoped
public class PersistOrganizationDelegate {

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    MemberRepository memberRepository;

    @Inject
    BommelRepository bommelRepository;

    @Transactional
    public void persistOrg(@Valid Organization organization, @Valid Member owner) {

        owner.addOrganization(organization);

        memberRepository.persist(owner);
        organizationRepository.persist(organization);

        Bommel rootBommel = new Bommel();
        rootBommel.setName(organization.getName());
        rootBommel.setParent(null);
        rootBommel.setOrganization(organization);
        rootBommel.setEmoji(Bommel.DEFAULT_ROOT_BOMMEL_EMOJI);
        rootBommel.setResponsibleMember(owner);

        bommelRepository.persist(rootBommel);
    }
}
