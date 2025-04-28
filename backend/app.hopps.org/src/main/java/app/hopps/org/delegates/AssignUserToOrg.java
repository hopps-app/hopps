package app.hopps.org.delegates;

import app.hopps.org.jpa.Member;
import app.hopps.org.jpa.MemberRepository;
import app.hopps.org.jpa.Organization;
import app.hopps.org.jpa.OrganizationRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.kie.kogito.internal.process.runtime.KogitoProcessContext;

import java.util.Optional;

@ApplicationScoped
public class AssignUserToOrg {
    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    MemberRepository memberRepository;

    @Transactional
    public void assignUserToOrg(String email, String slug, KogitoProcessContext context) {
        Organization organization = organizationRepository.findBySlug(slug);
        Member member = memberRepository.findByEmail(email);

        member.addOrganization(organization);
        member.persist();
    }

    public void checkUserToOrgMapping(String email, String slug, KogitoProcessContext context) throws Exception {
        Member member = memberRepository.findByEmail(email);

        Optional<Organization> org = member.getOrganizations()
                .stream()
                .filter(o -> o.getSlug().equals(slug))
                .findFirst();

        if (org.isPresent()) {
            throw new Exception("member already assigned to organization");
        }
    }
}
