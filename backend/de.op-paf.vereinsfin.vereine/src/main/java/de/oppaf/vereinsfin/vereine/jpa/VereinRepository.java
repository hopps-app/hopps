package de.oppaf.vereinsfin.vereine.jpa;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class VereinRepository implements PanacheRepository<Verein> {

    // auto implemented
}
