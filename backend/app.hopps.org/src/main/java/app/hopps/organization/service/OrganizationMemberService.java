package app.hopps.organization.service;

import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.domain.Member;
import app.hopps.member.domain.MemberStatus;
import app.hopps.member.domain.Permission;
import app.hopps.member.domain.Role;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.model.MemberUpdateInput;
import app.hopps.shared.security.AccessService;
import app.hopps.shared.validation.NonUniqueConstraintViolation;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import jakarta.ws.rs.BadRequestException;
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
     * @param role
     *            the role the person gets in the organization; anything but {@link Role#OWNER}
     * @param currentUser
     *            the member making the request, who needs {@link Permission#MANAGE_MEMBERS}
     *
     * @return the persisted member, whose {@link app.hopps.member.domain.MemberStatus} says whether the invitation
     *         email reached them
     *
     * @throws ForbiddenException
     *             if the current user may not manage members
     * @throws BadRequestException
     *             if the role is the founder's
     * @throws ConstraintViolationException
     *             if the member is missing required fields
     * @throws NonUniqueConstraintViolation.NonUniqueConstraintViolationException
     *             if a member with that email already exists
     * @throws jakarta.ws.rs.WebApplicationException
     *             if the identity provider account cannot be provisioned
     */
    public Member addMember(Organization organization, Member member, Role role, Member currentUser) {
        accessService.require(currentUser, Permission.MANAGE_MEMBERS, organization);
        requireAssignable(role);

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
            persistenceDelegate.persistMember(member, organization, role);
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

        LOG.info("Added member {} to organization {} as {} with status {}", member.getEmail(),
                organization.getSlug(), role, member.getStatus());
        return member;
    }

    /**
     * Gives a member of the organization another role. It applies with their next request, since permissions are read
     * from the membership on every request.
     *
     * @param organization
     *            the current user's organization
     * @param memberId
     *            the member whose role changes
     * @param role
     *            the new role; anything but {@link Role#OWNER}
     * @param currentUser
     *            the member making the request, who needs {@link Permission#MANAGE_MEMBERS}
     *
     * @return the member, now holding the new role
     *
     * @throws ForbiddenException
     *             if the current user may not manage members
     * @throws BadRequestException
     *             if no role or the founder's role is given
     * @throws NotFoundException
     *             if no member with that id belongs to the organization
     * @throws ClientErrorException
     *             (409 Conflict) if the member is the current user or the founder: there is always exactly one founder,
     *             and nobody changes their own role
     */
    @Transactional
    public Member changeRole(Organization organization, long memberId, Role role, Member currentUser) {
        accessService.require(currentUser, Permission.MANAGE_MEMBERS, organization);
        requireAssignable(role);

        Member member = memberRepository.findById(memberId);
        if (member == null || member.getRole(organization).isEmpty()) {
            throw new NotFoundException("No member " + memberId + " in organization " + organization.getSlug());
        }
        if (Objects.equals(member.id, currentUser.id)) {
            throw new ClientErrorException("Members cannot change their own role", Response.Status.CONFLICT);
        }
        if (member.getRole(organization).filter(Role.OWNER::equals).isPresent()) {
            throw new ClientErrorException("The founder's role cannot be changed", Response.Status.CONFLICT);
        }

        member.changeRole(organization, role);
        LOG.info("Changed role of member {} in organization {} to {}", member.getEmail(), organization.getSlug(),
                role);
        return member;
    }

    /**
     * Corrects a member's name and, while their invitation is pending, their email address. A new address gets the
     * invitation again, and the account for the old address is deleted if it was never used.
     *
     * @param organization
     *            the current user's organization
     * @param memberId
     *            the member to correct
     * @param input
     *            the corrected details; fields left out keep their value
     * @param currentUser
     *            the member making the request, who needs {@link Permission#MANAGE_MEMBERS}
     *
     * @return the member with the corrected details
     *
     * @throws ForbiddenException
     *             if the current user may not manage members
     * @throws NotFoundException
     *             if no member with that id belongs to the organization
     * @throws ConstraintViolationException
     *             if a name is blank or the email is invalid
     * @throws ClientErrorException
     *             (409 Conflict) if the email of a member who has logged in would change
     * @throws NonUniqueConstraintViolation.NonUniqueConstraintViolationException
     *             if another member already has the new email
     */
    public Member updateMember(Organization organization, long memberId, MemberUpdateInput input,
            Member currentUser) {
        accessService.require(currentUser, Permission.MANAGE_MEMBERS, organization);

        Member stored = memberRepository.findById(memberId);
        if (stored == null || stored.getRole(organization).isEmpty()) {
            throw new NotFoundException("No member " + memberId + " in organization " + organization.getSlug());
        }

        Member corrected = new Member();
        corrected.id = stored.id;
        corrected.setFirstName(valueOr(input.firstName(), stored.getFirstName()));
        corrected.setLastName(valueOr(input.lastName(), stored.getLastName()));
        corrected.setEmail(valueOr(input.email(), stored.getEmail()));
        corrected.setKeycloakId(stored.getKeycloakId());
        corrected.setStatus(stored.getStatus());

        Set<ConstraintViolation<Member>> violations = validator.validate(corrected);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }

        boolean emailChanged = !corrected.getEmail().equalsIgnoreCase(stored.getEmail());
        if (!emailChanged) {
            Member updated = persistenceDelegate.updateMember(corrected);
            LOG.info("Corrected the name of member {} in organization {}", updated.getEmail(), organization.getSlug());
            return updated;
        }

        if (stored.getStatus() == MemberStatus.ACTIVE) {
            throw new ClientErrorException("The email of a member who has logged in can only be changed by them",
                    Response.Status.CONFLICT);
        }
        if (memberRepository.findByEmail(corrected.getEmail()) != null) {
            throw new NonUniqueConstraintViolation.NonUniqueConstraintViolationException(
                    Set.of(new NonUniqueConstraintViolation("email", corrected)));
        }

        // The invitation moves to the new address, deliberately before and outside of the transaction.
        String oldIdentityId = stored.getKeycloakId();
        boolean userCreated = identityProvisioningService.inviteMember(corrected, memberRoleName);

        Member updated;
        try {
            updated = persistenceDelegate.updateMember(corrected);
        } catch (RuntimeException e) {
            if (userCreated) {
                identityProvisioningService.deleteUser(corrected.getKeycloakId());
            }
            throw e;
        }

        if (oldIdentityId != null && !oldIdentityId.equals(updated.getKeycloakId())
                && memberRepository.findByKeycloakId(oldIdentityId) == null) {
            identityProvisioningService.deleteUnusedUser(oldIdentityId);
        }
        LOG.info("Moved the invitation of member {} in organization {} to {}, status {}", stored.getEmail(),
                organization.getSlug(), updated.getEmail(), updated.getStatus());
        return updated;
    }

    /** The trimmed value, or the fallback if the value is missing or blank. */
    private static String valueOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static void requireAssignable(Role role) {
        if (role == null || !role.isAssignable()) {
            throw new BadRequestException("Role " + role + " cannot be assigned");
        }
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
