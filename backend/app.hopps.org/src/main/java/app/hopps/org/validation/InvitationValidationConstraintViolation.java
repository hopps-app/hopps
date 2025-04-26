package app.hopps.org.validation;

import java.util.Collections;
import java.util.Set;

public record InvitationValidationConstraintViolation(String field, Object value) {

    public String getMessage() {
        return "invitation must be valid";
    }

    public static final class InvitationValidationConstraintViolationException extends Exception {

        private final Set<InvitationValidationConstraintViolation> violations;

        public InvitationValidationConstraintViolationException(Set<InvitationValidationConstraintViolation> violations) {
            super("invitation not valid");
            this.violations = violations;
        }

        public Set<InvitationValidationConstraintViolation> getViolations() {
            return Collections.unmodifiableSet(violations);
        }
    }
}
