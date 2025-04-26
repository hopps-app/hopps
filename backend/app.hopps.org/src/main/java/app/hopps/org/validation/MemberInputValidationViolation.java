package app.hopps.org.validation;

import java.util.Collections;
import java.util.Set;

public record MemberInputValidationViolation(String field, Object root) {

    public String getMessage() {
        return "member data must be valid";
    }

    public static final class InvitationValidationConstraintViolationException extends Exception {

        private final Set<InvitationValidationConstraintViolationException> violations;

        public InvitationValidationConstraintViolationException(Set<InvitationValidationConstraintViolationException> violations) {
            super("member data not valid");
            this.violations = violations;
        }

        public Set<InvitationValidationConstraintViolationException> getViolations() {
            return Collections.unmodifiableSet(violations);
        }
    }
}
