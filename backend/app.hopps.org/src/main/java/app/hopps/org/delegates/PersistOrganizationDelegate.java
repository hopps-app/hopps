package app.hopps.org.delegates;

import app.hopps.commons.fga.FgaHelper;
import app.hopps.commons.fga.FgaRelations;
import app.hopps.commons.fga.FgaTypes;
import app.hopps.org.jpa.Bommel;
import app.hopps.org.jpa.BommelRepository;
import app.hopps.org.jpa.Member;
import app.hopps.org.jpa.MemberRepository;
import app.hopps.org.jpa.Organization;
import app.hopps.org.jpa.OrganizationRepository;
import io.quarkiverse.openfga.client.AuthorizationModelClient;
import io.quarkiverse.openfga.client.model.ConditionalTupleKey;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

@ApplicationScoped
@SuppressWarnings("java:S6813")
public class PersistOrganizationDelegate {

    @Inject
    AuthorizationModelClient modelClient;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    MemberRepository memberRepository;

    @Inject
    BommelRepository bommelRepository;

    @Transactional
    public void persistOrg(@Valid Organization organization, @Valid Member owner) {
        owner.addOrganization(organization);

        Bommel rootBommel = new Bommel();
        rootBommel.setName(organization.getName());
        rootBommel.setParent(null);
        rootBommel.setOrganization(organization);
        rootBommel.setEmoji(Bommel.DEFAULT_ROOT_BOMMEL_EMOJI);
        rootBommel.setResponsibleMember(owner);

        organization.addMember(owner);
        organization.setRootBommel(rootBommel);

        memberRepository.persist(owner);
        organizationRepository.persist(organization);
        bommelRepository.persist(rootBommel);

        updateFga(organization.getSlug(), owner.getEmail(), rootBommel.id);
    }

    private void updateFga(String slug, String email, Long bommelId) {
        slug = FgaHelper.sanitize(slug);
        email = FgaHelper.sanitize(email);

        String fgaUser = FgaTypes.USER.getFgaName() + ":" + email;
        String fgaOrganization = FgaTypes.ORGANIZATION.getFgaName() + ":" + slug;
        String fgaBommel = FgaTypes.BOMMEL.getFgaName() + ":" + bommelId;

        ConditionalTupleKey userToOrgTupleKey = ConditionalTupleKey.of(fgaOrganization,
                FgaRelations.OWNER.getFgaName(),
                fgaUser);
        ConditionalTupleKey orgToBommelTupleKey = ConditionalTupleKey.of(fgaBommel,
                FgaRelations.ORGANIZATION.getFgaName(),
                fgaOrganization);

        modelClient
                .write(List.of(userToOrgTupleKey, orgToBommelTupleKey), Collections.emptyList())
                .await()
                .atMost(Duration.ofSeconds(3));
    }
}
