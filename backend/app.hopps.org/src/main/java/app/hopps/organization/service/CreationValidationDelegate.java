package app.hopps.organization.service;

import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.validation.NonUniqueConstraintViolation;
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
    MemberRepository memberRepository;

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
     * Validates that the organization slug and owner email are unique in the database.
     *
     * @param organization
     *            The Organization to be validated if the slug is already taken
     * @param owner
     *            The owner to be validated if the email is already registered
     *
     * @throws NonUniqueConstraintViolation.NonUniqueConstraintViolationException
     *             if email or slug already exists
     */
    public void validateUniqueness(Organization organization, Member owner)
            throws NonUniqueConstraintViolation.NonUniqueConstraintViolationException {
        // Not using Jakarta Validator is intentional, as a Hibernate Proxy might be valid,
        // although its content is already in the database, ergo not unique

        Set<NonUniqueConstraintViolation> nonUniqueConstraintViolations = new HashSet<>();
        boolean ownerUnique = (memberRepository.findByEmail(owner.getEmail()) == null);
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
