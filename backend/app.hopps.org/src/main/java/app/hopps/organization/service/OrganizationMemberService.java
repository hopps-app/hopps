package app.hopps.organization.service;

import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.domain.Member;
import app.hopps.member.domain.Permission;
import app.hopps.member.domain.Role;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.AccessService;
import app.hopps.shared.validation.NonUniqueConstraintViolation;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Objects;
import java.util.Set;

/**
 * Adds a person to an existing organization and gives them access to the app. Unlike the founder, who picks a password
 * while registering the organization, an invited user gets a credential-less identity provider account plus an
 * invitation email in which they choose their own password
 */
@ApplicationScoped
public class OrganizationMemberService {

    private static final Logger LOG = LoggerFactory.getLogger(OrganizationMemberService.class);

    @Inject
    Validator validator;

    @Inject
    MemberRepository memberRepository;

    @Inject
    IdentityProvisioningService identityProvisioningService;

    @Inject
    PersistMemberDelegate persistenceDelegate;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    AccessService accessService;

    @ConfigProperty(name = "app.hopps.org.auth.member-role")
    String memberRoleName;

    /**
     * @param organization
     *            the organization to add the person to
     * @param member
     *            the person to add, not yet persisted and without a Keycloak id
     * @param currentUser
     *            the member making the request, who needs {@link Permission#MANAGE_MEMBERS}
     *
     * @return the persisted member, whose {@link app.hopps.member.domain.MemberStatus} says whether the invitation
     *         email reached them
     *
     * @throws ForbiddenException
     *             if the current user may not manage members
     * @throws ConstraintViolationException
     *             if the member is missing required fields
     * @throws NonUniqueConstraintViolation.NonUniqueConstraintViolationException
     *             if a member with that email already exists
     * @throws jakarta.ws.rs.WebApplicationException
     *             if the identity provider account cannot be provisioned
     */
    public Member addMember(Organization organization, Member member, Member currentUser) {
        accessService.require(currentUser, Permission.MANAGE_MEMBERS, organization);

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

        // provision the identity provider account and send the invitation, deliberately before and outside of the
        // transaction
        boolean userCreated = identityProvisioningService.inviteMember(member, memberRoleName);

        try {
            persistenceDelegate.persistMember(member, organization);
        } catch (RuntimeException e) {
            // Undo the invitation so a failed request does not leave an account behind that nothing points at. Only
            // an account we created ourselves may go — a linked, pre-existing one belongs to someone else.
            if (userCreated) {
                LOG.warn("Persisting member {} failed, removing the identity provider account again",
                        member.getEmail());
                identityProvisioningService.deleteUser(member.getKeycloakId());
            }
            throw e;
        }

        LOG.info("Added member {} to organization {} with status {}", member.getEmail(), organization.getSlug(),
                member.getStatus());
        return member;
    }

    /**
     * Takes a person out of an organization in hopps. Only hopps's own records change: their account at the identity
     * provider (Keycloak or Authentik) stays untouched, so they can still log in there, just no longer into this
     * organization. Their roles within the organization go with them, and a member without any organization left is
     * deleted entirely, which also clears them as the responsible person of any bommel.
     *
     * @param organization
     *            the current user's organization
     * @param memberId
     *            the member to remove
     * @param currentUser
     *            the member making the request, who needs {@link Permission#MANAGE_MEMBERS}
     *
     * @throws ForbiddenException
     *             if the current user may not manage members
     * @throws NotFoundException
     *             if no member with that id belongs to the organization
     * @throws ClientErrorException
     *             (409 Conflict) if the member is the current user or the organization's owner: nobody could undo that
     */
    @Transactional
    public void removeMember(Organization organization, long memberId, Member currentUser) {
        accessService.require(currentUser, Permission.MANAGE_MEMBERS, organization);

        Member member = memberRepository.findById(memberId);
        if (member == null || member.getRole(organization).isEmpty()) {
            throw new NotFoundException("No member " + memberId + " in organization " + organization.getSlug());
        }
        if (Objects.equals(member.id, currentUser.id)) {
            throw new ClientErrorException("Members cannot remove themselves", Response.Status.CONFLICT);
        }
        if (member.getRole(organization).filter(Role.OWNER::equals).isPresent()) {
            throw new ClientErrorException("The owner cannot be removed", Response.Status.CONFLICT);
        }

        // Role lives on the same membership row, so removing it takes the role with it.
        member.removeOrganization(organization);

        if (member.getOrganizations().isEmpty()) {
            bommelRepository.update("responsibleMember = null where responsibleMember = ?1", member);
            memberRepository.delete(member);
        }
        LOG.info("Removed member {} from organization {}", member.getEmail(), organization.getSlug());
    }
}
