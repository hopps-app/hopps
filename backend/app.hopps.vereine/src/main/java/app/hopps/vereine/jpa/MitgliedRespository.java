package app.hopps.vereine.jpa;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MitgliedRespository implements PanacheRepository<Mitglied> {

    public Mitglied findByEmail(String email) {
        return find("email", email).firstResult();
    }
}
