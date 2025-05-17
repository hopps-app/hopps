package app.hopps.org.delegates;

import app.hopps.org.jpa.Member;
import app.hopps.org.jpa.MemberRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class MemberPersistenceDelegate {

    @Inject
    MemberRepository memberRepository;

    @Transactional
    public void persist(Member member) {
        memberRepository.persist(member);
    }
}
