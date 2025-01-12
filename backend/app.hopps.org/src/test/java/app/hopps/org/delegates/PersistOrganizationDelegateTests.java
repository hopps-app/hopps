package app.hopps.org.delegates;

import app.hopps.org.jpa.BommelRepository;
import app.hopps.org.jpa.Member;
import app.hopps.org.jpa.MemberRepository;
import app.hopps.org.jpa.Organization;
import app.hopps.org.jpa.OrganizationRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasProperty;
import static org.hamcrest.collection.IsIterableWithSize.iterableWithSize;

@QuarkusTest
class PersistOrganizationDelegateTests {

    @Inject
    PersistOrganizationDelegate persistOrganizationDelegate;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    MemberRepository memberRepository;

    @BeforeEach
    @Transactional
    void cleanupDB() {
        organizationRepository.deleteAll();
        bommelRepository.deleteAll();
        memberRepository.deleteAll();
    }

    @Test
    void shouldCreateRootBommel() {

        // given
        Organization kegelclub = new Organization();
        kegelclub.setName("Kegelklub 777");
        kegelclub.setType(Organization.TYPE.EINGETRAGENER_VEREIN);
        kegelclub.setSlug("kegelklub-777");

        Member kevin = new Member();
        kevin.setFirstName("Kevin");
        kevin.setLastName("Kegelkönig");
        kevin.setEmail("pinking777@gmail.com");

        // when
        persistOrganizationDelegate.persistOrg(kegelclub, kevin);

        // then
        assertThat(organizationRepository.listAll(), iterableWithSize(1));
        assertThat(bommelRepository.listAll(), iterableWithSize(1));
        assertThat(bommelRepository.listAll(), hasItem(hasProperty("emoji", equalTo("\uD83C\uDF33"))));
    }

    @Test
    void memberShouldBePartOfNewlyCreatedOrganization() {

        // given
        Organization kegelclub = new Organization();
        kegelclub.setName("Kegelklub 777");
        kegelclub.setType(Organization.TYPE.EINGETRAGENER_VEREIN);
        kegelclub.setSlug("kegelklub-777");

        Member kevin = new Member();
        kevin.setFirstName("Kevin");
        kevin.setLastName("Kegelkönig");
        kevin.setEmail("pinking777@gmail.com");

        // when
        persistOrganizationDelegate.persistOrg(kegelclub, kevin);

        // then
        assertThat(kevin.getOrganizations(), iterableWithSize(1));
    }
}
