package app.hopps.vereine.jpa;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MemberRespository implements PanacheRepository<Member> {

    public Member findByEmail(String email) {
        return find("email", email).firstResult();
    }
}
