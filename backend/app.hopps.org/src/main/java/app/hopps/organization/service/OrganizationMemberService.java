package app.hopps.organization.service;

import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.validation.NonUniqueConstraintViolation;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Set;

/**
 * Adds a person to an existing organization and gives them access to the app. Unlike the founder, who picks a password
 * while registering the organization, an invited user gets a credential-less Keycloak account plus an invitation email
 * in which they choose their own password
 */
@ApplicationScoped
public class OrganizationMemberService {

    private static final Logger LOG = LoggerFactory.getLogger(OrganizationMemberService.class);

    @Inject
    Validator validator;

    @Inject
    MemberRepository memberRepository;

    @Inject
    CreateUserInKeycloak keycloakService;

    @Inject
    PersistMemberDelegate persistenceDelegate;

    @ConfigProperty(name = "app.hopps.org.auth.member-role")
    String memberRoleName;

    /**
     * @param organization
     *            the organization to add the person to
     * @param member
     *            the person to add, not yet persisted and without a Keycloak id
     *
     * @return the persisted member, whose {@link app.hopps.member.domain.MemberStatus} says whether the invitation
     *         email reached them
     *
     * @throws ConstraintViolationException
     *             if the member is missing required fields
     * @throws NonUniqueConstraintViolation.NonUniqueConstraintViolationException
     *             if a member with that email already exists
     * @throws jakarta.ws.rs.WebApplicationException
     *             if the Keycloak account cannot be provisioned
     */
    public Member addMember(Organization organization, Member member) {
        LOG.info("Adding member {} to organization {}", member.getEmail(), organization.getSlug());

        // validate constraints using Jakarta Bean Validation
        Set<ConstraintViolation<Member>> violations = validator.validate(member);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }

        // the email is unique across all members, not just within this organization
        if (memberRepository.findByEmail(member.getEmail()) != null) {
            throw new NonUniqueConstraintViolation.NonUniqueConstraintViolationException(
                    Set.of(new NonUniqueConstraintViolation("email", member)));
        }

        // provision the Keycloak account and send the invitation, deliberately before and outside of the transaction
        boolean userCreated = keycloakService.inviteUser(member, memberRoleName);

        try {
            persistenceDelegate.persistMember(member, organization);
        } catch (RuntimeException e) {
            // Undo the invitation so a failed request does not leave an account behind that nothing points at. Only
            // an account we created ourselves may go — a linked, pre-existing one belongs to someone else.
            if (userCreated) {
                LOG.warn("Persisting member {} failed, removing the Keycloak account again", member.getEmail());
                keycloakService.deleteUser(member.getKeycloakId());
            }
            throw e;
        }

        LOG.info("Added member {} to organization {} with status {}", member.getEmail(), organization.getSlug(),
                member.getStatus());
        return member;
    }
}
