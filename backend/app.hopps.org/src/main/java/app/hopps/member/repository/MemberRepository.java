package app.hopps.member.repository;

import app.hopps.member.domain.Member;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MemberRepository implements PanacheRepository<Member> {

    public Member findByEmail(String email) {
        return find("email", email).firstResult();
    }

    /**
     * Looks up a member by their stable Keycloak user id (the JWT {@code sub} claim). This is the canonical way to
     * resolve the currently authenticated member, since the Keycloak id never changes.
     */
    public Member findByKeycloakId(String keycloakId) {
        if (keycloakId == null) {
            return null;
        }
        return find("keycloakId", keycloakId).firstResult();
    }
}
