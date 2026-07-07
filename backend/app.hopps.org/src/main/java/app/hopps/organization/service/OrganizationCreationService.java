package app.hopps.organization.service;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.validation.NonUniqueConstraintViolation;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.core.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Service for creating new organizations with their owners. This service replaces the former BPMN-based workflow and
 * orchestrates all steps required for organization creation in plain Java.
 * <p>
 * The creation process follows these steps:
 * </p>
 * <ol>
 * <li>Validate constraints on Organization and Member entities</li>
 * <li>Validate uniqueness of email (owner) and slug (organization)</li>
 * <li>Create user in Keycloak identity provider</li>
 * <li>Persist Organization, Member, and root Bommel entities</li>
 * </ol>
 */
@ApplicationScoped
public class OrganizationCreationService {

    private static final Logger LOG = LoggerFactory.getLogger(OrganizationCreationService.class);

    @Inject
    CreationValidationDelegate validationDelegate;

    @Inject
    CreateUserInKeycloak keycloakService;

    @Inject
    PersistOrganizationDelegate persistenceDelegate;

    @Inject
    MemberRepository memberRepository;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    BommelRepository bommelRepository;

    /**
     * Creates a new organization with its owner.
     *
     * @param organization
     *            The organization to create
     * @param owner
     *            The owner/initial member of the organization
     * @param newPassword
     *            The password for the new Keycloak user
     *
     * @throws ConstraintViolationException
     *             if validation of organization or owner fails
     * @throws NonUniqueConstraintViolation.NonUniqueConstraintViolationException
     *             if email or slug already exists
     * @throws jakarta.ws.rs.WebApplicationException
     *             if Keycloak user creation fails
     */
    public void createOrganization(Organization organization, Member owner, String newPassword) {
        LOG.info("Starting organization creation: name={}, slug={}, owner={}",
                organization.getName(), organization.getSlug(), owner.getEmail());

        // Step 1: Validate constraints using Jakarta Bean Validation
        LOG.debug("Validating constraints for organization and owner");
        validationDelegate.validateWithValidator(organization, owner);

        // Step 2: Validate uniqueness of email and slug
        LOG.debug("Validating uniqueness of email and slug");
        validationDelegate.validateUniqueness(organization, owner);

        // Step 3: Create user in Keycloak
        LOG.debug("Creating user in Keycloak: {}", owner.getEmail());
        keycloakService.createUserInKeycloak(owner, newPassword);
        LOG.info("Successfully created Keycloak user: {}", owner.getEmail());

        // Step 4: Persist JPA entities (Organization, Member, root Bommel)
        LOG.debug("Persisting organization entities");
        persistenceDelegate.persistOrg(organization, owner);
        LOG.info("Successfully created organization: {} ({})", organization.getName(), organization.getSlug());
    }

    /**
     * Creates an organization for an already-authenticated Keycloak user. The user's member is looked up by their
     * Keycloak id (JWT {@code sub}) and created on the fly if it doesn't exist yet — no new Keycloak user is
     * provisioned. The organization is linked to that member (with a root bommel) and thereby becomes the user's
     * default organization on the next login.
     *
     * @throws ConstraintViolationException
     *             if the organization (or the newly built member) fails bean validation
     * @throws NonUniqueConstraintViolation.NonUniqueConstraintViolationException
     *             if the slug already exists
     * @throws ClientErrorException
     *             (409 Conflict) if the user is already assigned to an organization
     */
    @Transactional
    public Organization createOrganizationForCurrentUser(Organization organization, String keycloakId, String email,
            String firstName, String lastName) {
        if (keycloakId == null || keycloakId.isBlank()) {
            throw new ClientErrorException("Missing user identity", Response.Status.UNAUTHORIZED);
        }

        Member member = memberRepository.findByKeycloakId(keycloakId);
        if (member != null && !member.getOrganizations().isEmpty()) {
            throw new ClientErrorException("User is already assigned to an organization", Response.Status.CONFLICT);
        }

        boolean newMember = member == null;
        if (newMember) {
            member = new Member();
            member.setKeycloakId(keycloakId);
            member.setEmail(email);
            member.setFirstName(firstName);
            member.setLastName(lastName);
        }

        // Validate the organization (and the member's mandatory fields); the email uniqueness check is skipped because
        // the account already exists — only the slug must be unique.
        validationDelegate.validateWithValidator(organization, member);
        validationDelegate.validateSlugUnique(organization);

        member.addOrganization(organization);

        Bommel rootBommel = new Bommel();
        rootBommel.setName(organization.getName());
        rootBommel.setParent(null);
        rootBommel.setOrganization(organization);
        rootBommel.setEmoji(Bommel.DEFAULT_ROOT_BOMMEL_EMOJI);
        rootBommel.setResponsibleMember(member);

        organization.addMember(member);
        organization.setRootBommel(rootBommel);

        if (newMember) {
            memberRepository.persist(member);
        }
        organizationRepository.persist(organization);
        bommelRepository.persist(rootBommel);

        LOG.info("Created organization {} ({}) for existing user {}", organization.getName(), organization.getSlug(),
                keycloakId);
        return organization;
    }
}
