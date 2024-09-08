package app.hopps.vereine.delegates;

import app.hopps.vereine.jpa.Member;
import app.hopps.vereine.jpa.MemberRespository;
import app.hopps.vereine.jpa.Organization;
import app.hopps.vereine.jpa.OrganizationRepository;
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
    OrganizationRepository organizationRepository;

    @Inject
    MemberRespository memberRespository;

    @BeforeEach
    @Transactional
    void setUp() {
        organizationRepository.deleteAll();
        memberRespository.deleteAll();
    }

    @Test
    @DisplayName("should validate valid data")
    void shouldValidateWithJakartaValidator() {

        // given
        Organization organization = new Organization();
        organization.setName("Kegelclub 777");
        organization.setType(Organization.TYPE.EINGETRAGENER_VEREIN);
        organization.setSlug("kegelclub-777");

        Member owner = new Member();
        owner.setFirstName("Kevin");
        owner.setLastName("Kegler");
        owner.setEmail("kevin@example.com");

        organization.getMembers().add(owner);

        // when
        delegate.validateWithValidator(organization, owner);

        // then no exception
    }

    @Test
    @DisplayName("should invalidate invalid data")
    void shouldInvalidateWithJakartaValidator() {

        // given
        Organization organization = new Organization();
        organization.setName("Kegelclub 777");
        organization.setType(Organization.TYPE.EINGETRAGENER_VEREIN);
        organization.setSlug("kegelclub-777-");

        Member owner = new Member();
        owner.setFirstName("Kevin");
        owner.setLastName("Kegler");
        owner.setEmail("kevin@example.com");

        organization.getMembers().add(owner);

        // when
        assertThrows(ConstraintViolationException.class, () -> delegate.validateWithValidator(organization, owner));
    }

    @Test
    @DisplayName("should validate valid data")
    void shouldValidateUniqueness() throws Exception {

        // given empty database
        Organization organization = new Organization();
        organization.setName("Kegelclub 777");
        organization.setType(Organization.TYPE.EINGETRAGENER_VEREIN);
        organization.setSlug("kegelclub-777");

        Member owner = new Member();
        owner.setFirstName("Kevin");
        owner.setLastName("Kegler");
        owner.setEmail("kevin@example.com");

        organization.getMembers().add(owner);

        // when
        delegate.validateUniqueness(organization, owner);

        // then no exception
    }

    @Test
    @DisplayName("should validate valid data")
    void shouldInvalidateUniqueness() throws NonUniqueConstraintViolationException {

        // given
        Organization existingOrganization = new Organization();
        existingOrganization.setName("Kegelclub 777");
        existingOrganization.setType(Organization.TYPE.EINGETRAGENER_VEREIN);
        existingOrganization.setSlug("kegelclub-777");

        QuarkusTransaction.begin();
        organizationRepository.persist(existingOrganization);
        QuarkusTransaction.commit();

        // when
        Organization organization = new Organization();
        organization.setName("Kegelclub 777");
        organization.setType(Organization.TYPE.EINGETRAGENER_VEREIN);
        organization.setSlug("kegelclub-777");

        Member owner = new Member();
        owner.setFirstName("Kevin");
        owner.setLastName("Kegler");
        owner.setEmail("kevin@example.com");

        organization.getMembers().add(owner);


        // then
        NonUniqueConstraintViolationException exception = assertThrows(NonUniqueConstraintViolationException.class, () -> delegate.validateUniqueness(organization, owner));
        assertThat(exception.getViolations(), hasSize(1));

        NonUniqueConstraintViolation onlyViolation = exception.getViolations().stream().findFirst().orElseThrow();
        assertEquals("slug", onlyViolation.field());
        assertThat(onlyViolation.getMessage(), is("must be unique"));
        assertThat(onlyViolation.root(), IsInstanceOf.instanceOf(Organization.class));
    }
}
