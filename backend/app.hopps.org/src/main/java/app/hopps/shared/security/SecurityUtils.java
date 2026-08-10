package app.hopps.shared.security;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.MemberStatus;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collection;

/**
 * Security utility class for common authentication and authorization operations. Provides centralized methods for user
 * and organization retrieval.
 */
@ApplicationScoped
public class SecurityUtils {

    private static final Logger LOG = LoggerFactory.getLogger(SecurityUtils.class);

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
        Member me = requireMember(securityContext);

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
        return requireMember(securityContext);
    }

    /**
     * Resolves the member the current token belongs to, and takes the opportunity to record that they got in — see
     * {@link #recordAuthentication(Member)}.
     *
     * @throws WebApplicationException
     *             if no member is linked to the token's Keycloak id (404)
     */
    private Member requireMember(SecurityContext securityContext) {
        String keycloakId = KeycloakPrincipals.keycloakId(securityContext.getUserPrincipal());
        Member member = memberRepository.findByKeycloakId(keycloakId);

        if (member == null) {
            throw new WebApplicationException(Response.status(Response.Status.NOT_FOUND)
                    .entity("User not found in database")
                    .build());
        }

        recordAuthentication(member);
        return member;
    }

    /**
     * Keeps {@link MemberStatus} honest about who can actually log in. An invited member picks their password on
     * Keycloak, which hopps never sees, and there is no callback telling us the invitation was completed — but a valid
     * token is that signal: whoever presents one has demonstrably logged in. So the first authenticated request a
     * member makes promotes them to {@link MemberStatus#ACTIVE}.
     * <p>
     * Does nothing for members that already are active, which is the overwhelmingly common case — the write happens
     * once per member, ever. It runs in its own transaction so the promotion survives whatever the surrounding request
     * does with its own (the person logged in either way), and failures are logged rather than thrown: being unable to
     * record this must not fail an otherwise fine request, and the next one tries again.
     *
     * @param member
     *            the member the current token resolved to
     */
    public void recordAuthentication(Member member) {
        if (member == null || member.getStatus() == MemberStatus.ACTIVE) {
            return;
        }

        try {
            QuarkusTransaction.requiringNew().run(() -> memberRepository.markActive(member.id));
            // Keep the instance the running request holds in sync with the row we just wrote.
            member.setStatus(MemberStatus.ACTIVE);
            LOG.info("Member {} has logged in, status is now {}", member.getEmail(), MemberStatus.ACTIVE);
        } catch (RuntimeException e) {
            LOG.warn("Could not mark member {} as active", member.getEmail(), e);
        }
    }
}
