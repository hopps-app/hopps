package app.hopps.organization.domain;

import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Address;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.narayana.jta.QuarkusTransactionException;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.RollbackException;
import jakarta.transaction.Transactional;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import org.instancio.Instancio;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.Set;

import static org.hamcrest.CoreMatchers.not;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.collection.IsCollectionWithSize.hasSize;
import static org.hamcrest.collection.IsEmptyCollection.empty;
import static org.hamcrest.core.Is.is;
import static org.hamcrest.core.IsInstanceOf.instanceOf;
import static org.hamcrest.text.IsEmptyString.emptyOrNullString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
class OrganizationTests {

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    MemberRepository memberRepository;

    @Inject
    Validator validator;

    @BeforeEach
    @Transactional
    void setUp() {
        organizationRepository.deleteAll();
        memberRepository.deleteAll();
    }

    @Test
    @DisplayName("should persist a verein")
    @TestTransaction
    void shouldPersistVerein() {

        // given
        Organization organization = Instancio.create(Organization.class);
        organization.setId(null);
        organization.setSlug("i-am-a-valid-slug");
        organization.setMembers(Collections.emptySet());
        organization.setRootBommel(null);

        // when
        organizationRepository.persist(organization);

        // then
        assertThat(organizationRepository.listAll(), hasSize(1));
        assertNotNull(organizationRepository.listAll().getFirst().getName());
    }

    @Test
    @DisplayName("should have an embedded address")
    @TestTransaction
    void shouldHaveEmbeddedAddress() {

        // Caveat: @TestTransaction will not trigger the Hibernate Validation

        // given
        Organization organization = Instancio.create(Organization.class);
        organization.setId(null);
        organization.setMembers(Collections.emptySet());
        organization.setSlug("i-am-a-valid-slug");
        organization.setRootBommel(null);

        // when
        organizationRepository.persist(organization);

        // then
        Address address = organizationRepository.listAll().getFirst().getAddress();
        assertThat(address.getStreet(), not(emptyOrNullString()));
        assertThat(address.getNumber(), not(emptyOrNullString()));
    }

    @Test
    @DisplayName("must enforce a non blank name")
    void mustEnforceANonBlankName() {

        // given
        Organization organization = Instancio.create(Organization.class);
        organization.setId(null);
        organization.setName("");
        organization.setSlug("foobar");
        organization.setMembers(Collections.emptySet());

        // when
        Set<ConstraintViolation<Organization>> validations = validator.validate(organization);

        // then
        assertThat(validations, hasSize(1));

        ConstraintViolation<Organization> validation = validations.stream().findFirst().orElseThrow();
        assertEquals("name", validation.getPropertyPath().toString());
        assertEquals("must not be blank", validation.getMessage());
    }

    @Test
    @DisplayName("must not persist with a blank name and understand the exceptions")
    void mustNotPersistWithABlankName() {

        // given
        Organization organization = Instancio.create(Organization.class);
        organization.setId(null);
        organization.setName("");
        organization.setMembers(Collections.emptySet());
        organization.setRootBommel(null);

        // when
        QuarkusTransaction.begin();
        organizationRepository.persist(organization);
        try {
            QuarkusTransaction.commit();
        } catch (Exception e) {
            // then
            assertThat(e, instanceOf(QuarkusTransactionException.class));
            assertThat(e.getCause(), instanceOf(RollbackException.class));
            assertThat(e.getCause().getCause(), instanceOf(ConstraintViolationException.class));
            // yes, this is quite a complicated cascade
        }
    }

    @Test
    @DisplayName("should be able to have members")
    void shouldBeAbleToHaveMembers() {

        // given
        Organization kegelclub = new Organization();
        kegelclub.setName("Kegelklub 777");
        kegelclub.setType(Organization.TYPE.EINGETRAGENER_VEREIN);
        kegelclub.setSlug("kegelklub-999");

        Member kevin = new Member();
        kevin.setFirstName("Kevin");
        kevin.setLastName("Kegelkönig");
        kevin.setEmail("pinking777@gmail.com");

        // when
        kegelclub.getMembers().add(kevin);

        QuarkusTransaction.begin();
        organizationRepository.persist(kegelclub);
        QuarkusTransaction.commit();

        // then
        assertThat(memberRepository.listAll(), hasSize(1));
    }

    @Test
    @DisplayName("should only accept valid URL conform slugs")
    void shouldOnlyAcceptValidSlugs() {

        // given
        Organization kegelclub = new Organization();
        kegelclub.setName("Kegelklub 777");
        kegelclub.setType(Organization.TYPE.EINGETRAGENER_VEREIN);

        // when then
        kegelclub.setSlug("kegelklub-777");
        assertThat(validator.validate(kegelclub), is(empty()));

        kegelclub.setSlug("kegelklub777");
        assertThat(validator.validate(kegelclub), is(empty()));

        kegelclub.setSlug("777kegelklub");
        assertThat(validator.validate(kegelclub), is(empty()));

        kegelclub.setSlug("777");
        assertThat(validator.validate(kegelclub), is(empty()));

        kegelclub.setSlug("77kegel7");
        assertThat(validator.validate(kegelclub), is(empty()));

        kegelclub.setSlug("kegelklub-");
        assertThat(validator.validate(kegelclub), hasSize(1));

        kegelclub.setSlug("kegelklub#");
        assertThat(validator.validate(kegelclub), hasSize(1));

        kegelclub.setSlug("-777");
        assertThat(validator.validate(kegelclub), hasSize(1));
    }
}
