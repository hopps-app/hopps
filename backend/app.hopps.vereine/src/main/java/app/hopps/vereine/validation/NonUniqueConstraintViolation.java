package app.hopps.vereine.validation;

import java.util.Collections;
import java.util.Set;

public record NonUniqueConstraintViolation(String field, Object root) {

    public String getMessage() {
        return "must be unique";
    }

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
