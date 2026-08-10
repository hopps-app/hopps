package app.hopps.shared.security;

import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;

import java.util.Collection;

/**
 * Request-scoped context that provides the current user's organization. This is used by repositories to scope queries
 * to the current organization.
 */
@RequestScoped
public class OrganizationContext {
    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    MemberRepository memberRepository;

    @Inject
    SecurityUtils securityUtils;

    private Organization cachedOrganization;
    private boolean organizationResolved = false;

    /**
     * Returns the current user's organization, or null if not found.
     */
    public Organization getCurrentOrganization() {
        if (!organizationResolved) {
            resolveOrganization();
        }
        return cachedOrganization;
    }

    /**
     * Returns the current user's organization ID, or null if not found.
     */
    public Long getCurrentOrganizationId() {
        Organization org = getCurrentOrganization();
        return org != null ? org.getId() : null;
    }

    private void resolveOrganization() {
        organizationResolved = true;

        if (securityIdentity.isAnonymous()) {
            return;
        }

        String keycloakId = KeycloakPrincipals.keycloakId(securityIdentity.getPrincipal());
        Member member = memberRepository.findByKeycloakId(keycloakId);
        if (member == null) {
            return;
        }

        // Requests that only ever scope by organization never touch SecurityUtils, so this path has to record the
        // login too — otherwise someone who only visits, say, the transactions page would stay INVITED forever.
        securityUtils.recordAuthentication(member);

        Collection<Organization> orgs = member.getOrganizations();
        if (orgs.isEmpty()) {
            return;
        }

        // For now, just get the first organization
        cachedOrganization = orgs.iterator().next();
    }
}
