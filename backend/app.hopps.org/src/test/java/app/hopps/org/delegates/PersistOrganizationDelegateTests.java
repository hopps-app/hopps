package app.hopps.org.delegates;

import app.hopps.org.jpa.BommelRepository;
import app.hopps.org.jpa.Member;
import app.hopps.org.jpa.MemberRepository;
import app.hopps.org.jpa.Organization;
import app.hopps.org.jpa.OrganizationRepository;
import io.quarkiverse.openfga.client.AuthorizationModelClient;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.smallrye.mutiny.Uni;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Map;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasProperty;
import static org.hamcrest.collection.IsIterableWithSize.iterableWithSize;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

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

    @InjectMock
    AuthorizationModelClient authorizationModelClient;

    @BeforeEach
    @Transactional
    void cleanupDB() {
        organizationRepository.deleteAll();
        bommelRepository.deleteAll();
        memberRepository.deleteAll();

        Mockito.when(authorizationModelClient.write()).thenReturn(Uni.createFrom().item(Map.of()));
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
        assertThat(kegelclub.getMembers(), iterableWithSize(1));
    }

    @Test
    void rootBommelAndMemberShouldBeSaved() {

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
        kegelclub = organizationRepository.findById(kegelclub.getId());
        assertNotNull(kegelclub.getRootBommel());
        assertFalse(kegelclub.getMembers().isEmpty());
    }
}
