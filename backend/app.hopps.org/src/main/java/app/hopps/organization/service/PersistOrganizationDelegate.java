package app.hopps.organization.service;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.domain.Member;
import app.hopps.member.domain.Role;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.tenancy.TenancyService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;

@ApplicationScoped
@SuppressWarnings("java:S6813")
public class PersistOrganizationDelegate {

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    MemberRepository memberRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    TenancyService tenancyService;

    @Inject
    EntityManager entityManager;

    /**
     * Arbitrary but fixed key for the advisory lock that serialises the initial setup of a single-tenant installation.
     */
    private static final long SETUP_LOCK_KEY = 0x484F5050534F5247L; // "HOPPSORG"

    @Transactional
    public void persistOrg(@Valid Organization organization, @Valid Member owner) {
        if (tenancyService.isSingle()) {
            // Serialise concurrent setup attempts: the first one through creates the organization, the second sees it
            // and is refused. The transaction-scoped advisory lock is released with the commit or rollback.
            entityManager.createNativeQuery("select pg_advisory_xact_lock(:key)")
                    .setParameter("key", SETUP_LOCK_KEY)
                    .getSingleResult();
            tenancyService.assertSignUpAllowed();
        }

        Bommel rootBommel = new Bommel();
        rootBommel.setName(organization.getName());
        rootBommel.setParent(null);
        rootBommel.setOrganization(organization);
        rootBommel.setEmoji(Bommel.DEFAULT_ROOT_BOMMEL_EMOJI);
        rootBommel.setResponsibleMember(owner);

        organization.setRootBommel(rootBommel);

        // Order matters, and the three entities reference each other in a cycle: Member cascades PERSIST to
        // MemberOrganization, which needs the organization to exist; Organization cascades PERSIST to its root bommel,
        // whose responsibleMember is not cascaded and so needs the member to exist. Persisting both ends first and
        // linking them afterwards breaks the cycle - the membership row is written when the transaction flushes,
        // through the cascade on the now-managed member.
        memberRepository.persist(owner);
        organizationRepository.persist(organization);
        bommelRepository.persist(rootBommel);

        owner.addOrganization(organization, Role.OWNER);
        organization.addMember(owner, Role.OWNER);
    }
}
