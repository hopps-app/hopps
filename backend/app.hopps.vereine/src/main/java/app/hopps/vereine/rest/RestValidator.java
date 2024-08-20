package app.hopps.vereine.rest;

import jakarta.annotation.Nonnull;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public class RestValidator {

    private final Object candidate;

    private Validator validator;

    private RestValidator(Object candidate) {
        this.candidate = candidate;
    }

    public static RestValidator forCandidate(Object candidate) {
        return new RestValidator(candidate);
    }

    public RestValidator with(@Nonnull Validator validator) {
        this.validator = validator;
        return this;
    }

    public ValidationResult build() {

        if (this.validator == null) {
            throw new IllegalStateException("call with(Validator validator) first");
        }

        Set<ConstraintViolation<Object>> violations = validator.validate(candidate);
        if (violations.isEmpty()) {
            return ValidationResult.valid();
        } else {
            ValidationResult result = new ValidationResult();
            Set<Violation> restViolations = new HashSet<>();
            for (ConstraintViolation<Object> violation : violations) {
                Violation restViolation = new Violation();
                restViolation.setPropertyPath(violation.getPropertyPath().toString());
                restViolation.setMessage(violation.getMessage());
                restViolations.add(restViolation);
            }
            result.setViolations(restViolations);
            return result;
        }
    }

    public static class ValidationResult {

        public static ValidationResult valid() {
            return new ValidationResult();
        }

        public enum Validity {VALID, INVALID}

        private Set<Violation> violations = Collections.emptySet();

        public Set<Violation> getViolations() {
            return Collections.unmodifiableSet(violations);
        }

        public void setViolations(Set<Violation> violations) {
            this.violations = violations;
        }

        public Validity isValid() {
            return violations.isEmpty() ? Validity.VALID : Validity.INVALID;
        }
    }

    public static class Violation {

        private String propertyPath;
        private String message;

        public void setPropertyPath(String propertyPath) {
            this.propertyPath = propertyPath;
        }

        public String getPropertyPath() {
            return propertyPath;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public String getMessage() {
            return message;
        }
    }
}
