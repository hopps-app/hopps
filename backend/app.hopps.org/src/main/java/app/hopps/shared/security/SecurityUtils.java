package app.hopps.shared.security;

import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;

import java.util.Collection;

/**
 * Security utility class for common authentication and authorization operations. Provides centralized methods for user
 * and organization retrieval.
 */
@ApplicationScoped
public class SecurityUtils {

    @Inject
    MemberRepository memberRepository;

    /**
     * Retrieves the organization associated with the current authenticated user.
     *
     * @param securityContext
     *            the JAX-RS security context containing user principal
     *
     * @return the user's organization
     *
     * @throws WebApplicationException
     *             if user not found (404) or has no organization
     * @throws IllegalStateException
     *             if user belongs to multiple organizations (not yet supported)
     */
    public Organization getUserOrganization(SecurityContext securityContext) {
        String keycloakId = KeycloakPrincipals.keycloakId(securityContext.getUserPrincipal());
        Member me = memberRepository.findByKeycloakId(keycloakId);

        if (me == null) {
            throw new WebApplicationException(Response.status(Response.Status.NOT_FOUND)
                    .entity("User not found in database")
                    .build());
        }

        Collection<Organization> orgs = me.getOrganizations();
        if (orgs.size() > 1) {
            throw new IllegalStateException(
                    "More than one organization is currently not implemented. User: " + me.getEmail());
        }

        return orgs.stream()
                .findFirst()
                .orElseThrow(() -> new WebApplicationException(Response.status(Response.Status.NOT_FOUND)
                        .entity("Organization of user not found in database")
                        .build()));
    }

    /**
     * Retrieves the current authenticated user (member).
     *
     * @param securityContext
     *            the JAX-RS security context containing user principal
     *
     * @return the current user
     *
     * @throws WebApplicationException
     *             if user not found (404)
     */
    public Member getCurrentUser(SecurityContext securityContext) {
        String keycloakId = KeycloakPrincipals.keycloakId(securityContext.getUserPrincipal());
        Member member = memberRepository.findByKeycloakId(keycloakId);

        if (member == null) {
            throw new WebApplicationException(Response.status(Response.Status.NOT_FOUND)
                    .entity("User not found in database")
                    .build());
        }

        return member;
    }
}
