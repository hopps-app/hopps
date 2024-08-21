package app.hopps.vereine.delegates;

import app.hopps.vereine.jpa.Mitglied;
import app.hopps.vereine.jpa.MitgliedRespository;
import app.hopps.vereine.jpa.Verein;
import app.hopps.vereine.jpa.VereinRepository;
import app.hopps.vereine.validation.NonUniqueConstraintViolation;
import app.hopps.vereine.validation.NonUniqueConstraintViolation.NonUniqueConstraintViolationException;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.ConstraintViolationException;
import org.hamcrest.core.IsInstanceOf;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.collection.IsCollectionWithSize.hasSize;
import static org.hamcrest.core.Is.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@QuarkusTest
public class CreationValidationDelegateTests {

    @Inject
    CreationValidationDelegate delegate;

    @Inject
    VereinRepository vereinRepository;

    @Inject
    MitgliedRespository mitgliedRespository;

    @BeforeEach
    @Transactional
    void setUp() {

        vereinRepository.deleteAll();
        mitgliedRespository.deleteAll();
    }

    @Test
    @DisplayName("should validate valid data")
    void shouldValidateWithJakartaValidator() {

        // given
        Verein verein = new Verein();
        verein.setName("Kegelclub 777");
        verein.setType(Verein.TYPE.EINGETRAGENER_VEREIN);
        verein.setSlug("kegelclub-777");

        Mitglied owner = new Mitglied();
        owner.setFirstName("Kevin");
        owner.setLastName("Kegler");
        owner.setEmail("kevin@example.com");

        verein.getMitglieder().add(owner);

        // when
        delegate.validateWithValidator(verein, owner);

        // then no exception
    }

    @Test
    @DisplayName("should invalidate invalid data")
    void shouldInvalidateWithJakartaValidator() {

        // given
        Verein verein = new Verein();
        verein.setName("Kegelclub 777");
        verein.setType(Verein.TYPE.EINGETRAGENER_VEREIN);
        verein.setSlug("kegelclub-777-");

        Mitglied owner = new Mitglied();
        owner.setFirstName("Kevin");
        owner.setLastName("Kegler");
        owner.setEmail("kevin@example.com");

        verein.getMitglieder().add(owner);

        // when
        assertThrows(ConstraintViolationException.class, () -> delegate.validateWithValidator(verein, owner));
    }

    @Test
    @DisplayName("should validate valid data")
    void shouldValidateUniqueness() throws NonUniqueConstraintViolationException {

        // given empty database
        Verein verein = new Verein();
        verein.setName("Kegelclub 777");
        verein.setType(Verein.TYPE.EINGETRAGENER_VEREIN);
        verein.setSlug("kegelclub-777");

        Mitglied owner = new Mitglied();
        owner.setFirstName("Kevin");
        owner.setLastName("Kegler");
        owner.setEmail("kevin@example.com");

        verein.getMitglieder().add(owner);

        // when
        delegate.validateUniqueness(verein, owner);

        // then no exception
    }

    @Test
    @DisplayName("should validate valid data")
    void shouldInvalidateUniqueness() throws NonUniqueConstraintViolationException {

        // given
        Verein existingVerein = new Verein();
        existingVerein.setName("Kegelclub 777");
        existingVerein.setType(Verein.TYPE.EINGETRAGENER_VEREIN);
        existingVerein.setSlug("kegelclub-777");

        QuarkusTransaction.begin();
        vereinRepository.persist(existingVerein);
        QuarkusTransaction.commit();

        // when
        Verein verein = new Verein();
        verein.setName("Kegelclub 777");
        verein.setType(Verein.TYPE.EINGETRAGENER_VEREIN);
        verein.setSlug("kegelclub-777");

        Mitglied owner = new Mitglied();
        owner.setFirstName("Kevin");
        owner.setLastName("Kegler");
        owner.setEmail("kevin@example.com");

        verein.getMitglieder().add(owner);


        // then
        NonUniqueConstraintViolationException exception = assertThrows(NonUniqueConstraintViolationException.class, () -> delegate.validateUniqueness(verein, owner));
        assertThat(exception.getViolations(), hasSize(1));

        NonUniqueConstraintViolation onlyViolation = exception.getViolations().stream().findFirst().orElseThrow();
        assertEquals("slug", onlyViolation.field());
        assertThat(onlyViolation.getMessage(), is("must be unique"));
        assertThat(onlyViolation.root(), IsInstanceOf.instanceOf(Verein.class));
    }
}
