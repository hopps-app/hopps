package app.hopps.org.service;

import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
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
     * @throws WebApplicationException
     *             if user is not found or has no organization
     */
    public Organization getUserOrganization(SecurityContext securityContext) {
        String userName = securityContext.getUserPrincipal().getName();
        Member me = memberRepository.findByEmail(userName);
        if (me == null) {
            throw new WebApplicationException(Response.status(Response.Status.NOT_FOUND)
                    .entity("User not found in database")
                    .build());
        }

        Collection<Organization> orgs = me.getOrganizations();
        if (orgs.size() > 1) {
            throw new IllegalStateException(
                    "More than one organization is currently not implemented. User: " + userName);
        }

        return orgs.stream()
                .findFirst()
                .orElseThrow(() -> new WebApplicationException(Response.status(Response.Status.NOT_FOUND)
                        .entity("Organization of user not found in database")
                        .build()));
    }
}
