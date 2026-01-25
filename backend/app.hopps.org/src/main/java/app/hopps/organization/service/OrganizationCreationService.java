package app.hopps.organization.service;

import app.hopps.member.domain.Member;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.validation.NonUniqueConstraintViolation;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.validation.ConstraintViolationException;
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
}
