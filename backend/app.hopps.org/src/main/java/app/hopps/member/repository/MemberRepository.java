package app.hopps.member.repository;

import app.hopps.member.domain.Member;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MemberRepository implements PanacheRepository<Member> {

    public Member findByEmail(String email) {
        return find("email", email).firstResult();
    }
}
