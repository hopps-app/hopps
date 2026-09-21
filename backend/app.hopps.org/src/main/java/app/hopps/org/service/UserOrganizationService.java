package app.hopps.org.service;

import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.KeycloakPrincipals;
import app.hopps.shared.security.NoOrganizationAccessException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.SecurityContext;

import java.util.Collection;

@ApplicationScoped
public class UserOrganizationService {

    @Inject
    MemberRepository memberRepository;

    /**
     * Retrieves the organization for the currently authenticated user.
     *
     * @param securityContext
     *            The security context containing user information
     *
     * @return The user's organization
     *
     * @throws NoOrganizationAccessException
     *             (403) if no member is linked to the token or the member has no organization
     */
    public Organization getUserOrganization(SecurityContext securityContext) {
        String keycloakId = KeycloakPrincipals.keycloakId(securityContext.getUserPrincipal());
        Member me = memberRepository.findByKeycloakId(keycloakId);
        if (me == null) {
            throw new NoOrganizationAccessException("No member is linked to this account");
        }

        Collection<Organization> orgs = me.getOrganizations();
        if (orgs.size() > 1) {
            throw new IllegalStateException(
                    "More than one organization is currently not implemented. User: " + me.getEmail());
        }

        return orgs.stream()
                .findFirst()
                .orElseThrow(() -> new NoOrganizationAccessException("Member is not assigned to an organization"));
    }
}
