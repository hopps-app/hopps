package app.hopps.vereine.delegates;

import app.hopps.vereine.jpa.Mitglied;
import app.hopps.vereine.jpa.MitgliedRespository;
import app.hopps.vereine.jpa.Verein;
import app.hopps.vereine.jpa.VereinRepository;
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
    MitgliedRespository mitgliedRespository;

    @Inject
    VereinRepository vereinRepository;

    public void validateWithValidator(Verein verein, Mitglied owner) {

        Set<ConstraintViolation<?>> violations = new HashSet<>();
        violations.addAll(validator.validate(verein));
        violations.addAll(validator.validate(owner));

        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }
    }

    public void validateUniqueness(Verein verein, Mitglied owner) throws NonUniqueConstraintViolation.NonUniqueConstraintViolationException {

        // Not having a proper Jakarta Validator is intentional, as a Hibernate Proxy might be valid, although its content
        // is already in the database, ergo not unique

        Set<NonUniqueConstraintViolation> nonUniqueConstraintViolations = new HashSet<>();
        boolean ownerUnique = (mitgliedRespository.findByEmail(owner.getEmail()) == null);
        if (!ownerUnique) {
            nonUniqueConstraintViolations.add(new NonUniqueConstraintViolation("email", owner));
        }

        boolean vereinUnique = (vereinRepository.findBySlug(verein.getSlug()) == null);
        if (!vereinUnique) {
            nonUniqueConstraintViolations.add(new NonUniqueConstraintViolation("slug", verein));
        }

        if (!nonUniqueConstraintViolations.isEmpty()) {
            throw new NonUniqueConstraintViolation.NonUniqueConstraintViolationException(nonUniqueConstraintViolations);
        }
    }
}
