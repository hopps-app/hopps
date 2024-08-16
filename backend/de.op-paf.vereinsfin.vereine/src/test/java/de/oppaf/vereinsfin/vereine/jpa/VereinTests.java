package de.oppaf.vereinsfin.vereine.jpa;

import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.instancio.Instancio;
import org.junit.jupiter.api.Test;

import static org.hamcrest.CoreMatchers.not;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.collection.IsCollectionWithSize.hasSize;
import static org.hamcrest.text.IsEmptyString.emptyOrNullString;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
class VereinTests {

    @Inject
    VereinRepository vereinRepository;

    @Test
    @TestTransaction
    void shouldPersistVerein() {

        // given
        Verein verein = Instancio.create(Verein.class);
        verein.setId(null);

        // when
        vereinRepository.persist(verein);

        // then
        assertThat(vereinRepository.listAll(), hasSize(1));
        assertNotNull(vereinRepository.listAll().getFirst().getName());
    }

    @Test
    @TestTransaction
    void shouldHaveEmbeddedAddress() {

        // given
        Verein verein = Instancio.create(Verein.class);
        verein.setId(null);

        // when
        vereinRepository.persist(verein);

        // then
        Address address = vereinRepository.listAll().getFirst().getAddress();
        assertThat(address.getStreet(), not(emptyOrNullString()));
        assertThat(address.getNumber(), not(emptyOrNullString()));
    }
}
