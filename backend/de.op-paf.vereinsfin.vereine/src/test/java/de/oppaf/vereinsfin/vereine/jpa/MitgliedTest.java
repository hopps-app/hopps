package de.oppaf.vereinsfin.vereine.jpa;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.collection.IsCollectionWithSize.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
class MitgliedTest {

    @Inject
    Validator validator;

    @Test
    @DisplayName("must have valid email")
    void mustHaveValidEmail() {

        // given
        Mitglied datenschutzalman = new Mitglied();
        datenschutzalman.setFirstName("Lala");
        datenschutzalman.setLastName("Bubu");
        datenschutzalman.setEmail("darfstdunichtwissen");

        // when
        Set<ConstraintViolation<Mitglied>> violations = validator.validate(datenschutzalman);

        // then
        assertThat(violations, hasSize(1));

        ConstraintViolation<Mitglied> onlyViolation = violations.stream().findFirst().orElseThrow();
        assertEquals("email", onlyViolation.getPropertyPath().toString());
        assertEquals("must be a well-formed email address", onlyViolation.getMessage());
    }
}
