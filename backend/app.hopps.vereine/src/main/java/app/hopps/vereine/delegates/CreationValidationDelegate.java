package app.hopps.vereine.delegates;

import app.hopps.vereine.jpa.Member;
import app.hopps.vereine.jpa.MemberRespository;
import app.hopps.vereine.jpa.Organization;
import app.hopps.vereine.jpa.OrganizationRepository;
import app.hopps.vereine.validation.NonUniqueConstraintViolation;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;

import java.util.HashSet;
import java.util.Set;

@ApplicationScoped
public class CreationValidationDelegate {

    @Inject
    Validator validator;

    @Inject
    MemberRespository memberRespository;

    @Inject
    OrganizationRepository organizationRepository;

    public void validateWithValidator(Organization organization, Member owner) {

        Set<ConstraintViolation<?>> violations = new HashSet<>();
        violations.addAll(validator.validate(organization));
        violations.addAll(validator.validate(owner));

        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }
    }

    /**
     * @param organization The Organization to be validated if the slug is already taken
     * @param owner The owner to be validated if the email is already registered
     * @throws Exception if validation fails. It is intentionally java.lang.Exception, as Kogito cannot handle anything else
     */
    public void validateUniqueness(Organization organization, Member owner) throws Exception {

        // Not having a proper Jakarta Validator is intentional, as a Hibernate Proxy might be valid, although its content
        // is already in the database, ergo not unique

        Set<NonUniqueConstraintViolation> nonUniqueConstraintViolations = new HashSet<>();
        boolean ownerUnique = (memberRespository.findByEmail(owner.getEmail()) == null);
        if (!ownerUnique) {
            nonUniqueConstraintViolations.add(new NonUniqueConstraintViolation("email", owner));
        }

        boolean vereinUnique = (organizationRepository.findBySlug(organization.getSlug()) == null);
        if (!vereinUnique) {
            nonUniqueConstraintViolations.add(new NonUniqueConstraintViolation("slug", organization));
        }

        if (!nonUniqueConstraintViolations.isEmpty()) {
            throw new NonUniqueConstraintViolation.NonUniqueConstraintViolationException(nonUniqueConstraintViolations);
        }
    }
}
