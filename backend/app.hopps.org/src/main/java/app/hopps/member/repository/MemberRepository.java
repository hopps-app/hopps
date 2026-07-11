package app.hopps.member.repository;

import app.hopps.member.domain.Member;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.Instant;

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

    /**
     * Throttled "last seen" stamp for the member with the given Keycloak id. Performs a single bulk UPDATE that only
     * writes when the member's {@code lastSeenAt} is null or older than {@code staleBefore}, so a burst of requests
     * results in at most one write per throttle window. No-op when {@code keycloakId} is null.
     *
     * @return the number of rows updated (0 when throttled or the member is unknown)
     */
    @Transactional
    public int touchLastSeen(String keycloakId, Instant now, Instant staleBefore) {
        if (keycloakId == null) {
            return 0;
        }
        return update("lastSeenAt = ?1 where keycloakId = ?2 and (lastSeenAt is null or lastSeenAt < ?3)",
                now, keycloakId, staleBefore);
    }
}
