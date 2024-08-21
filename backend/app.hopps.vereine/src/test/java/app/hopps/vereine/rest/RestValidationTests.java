package app.hopps.vereine.rest;

import app.hopps.vereine.jpa.Verein;
import app.hopps.vereine.rest.RestValidator.ValidationResult;
import app.hopps.vereine.rest.RestValidator.Violation;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.validation.Validator;
import org.instancio.Instancio;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static app.hopps.vereine.rest.RestValidator.ValidationResult.Validity.INVALID;
import static app.hopps.vereine.rest.RestValidator.ValidationResult.Validity.VALID;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.collection.IsIterableWithSize.iterableWithSize;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
class RestValidationTests {

    @Inject
    Validator validator;

    @Test
    @DisplayName("should validate a valid verein")
    void shouldValidate() {

        // given
        Verein verein = Instancio.create(Verein.class);
        verein.setId(null);
        verein.setSlug("foobar");

        // when
        ValidationResult validationResult = RestValidator.forCandidate(verein)
                .with(validator)
                .build();

        // then
        assertEquals(VALID, validationResult.isValid());
    }

    @Test
    @DisplayName("should invalidate a verein without name")
    void shouldInvalidate() {

        // given
        Verein verein = Instancio.create(Verein.class);
        verein.setId(null);
        verein.setName("");
        verein.setSlug("foobar");

        // when
        ValidationResult validationResult = RestValidator.forCandidate(verein)
                .with(validator)
                .build();

        // then
        assertEquals(INVALID, validationResult.isValid());
        assertThat(validationResult.getViolations(), iterableWithSize(1));

        Violation onlyViolation = validationResult.getViolations().stream().findFirst().orElseThrow();
        assertEquals("name", onlyViolation.getPropertyPath());
        assertEquals("must not be blank", onlyViolation.getMessage());
    }
}
