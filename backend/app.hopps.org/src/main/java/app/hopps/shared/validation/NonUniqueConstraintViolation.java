package app.hopps.shared.validation;

import java.util.Collections;
import java.util.Set;

/**
 * Represents a uniqueness constraint violation for validation purposes.
 * Used when a field value must be unique but a duplicate is detected.
 */
public record NonUniqueConstraintViolation(String field, Object root) {

    public String getMessage() {
        return "must be unique";
    }

    /**
     * Exception thrown when one or more uniqueness constraints are violated.
     */
    public static final class NonUniqueConstraintViolationException extends Exception {

        private final Set<NonUniqueConstraintViolation> violations;

        public NonUniqueConstraintViolationException(Set<NonUniqueConstraintViolation> violations) {
            super("not unique");
            this.violations = violations;
        }

        public Set<NonUniqueConstraintViolation> getViolations() {
            return Collections.unmodifiableSet(violations);
        }
    }
}
