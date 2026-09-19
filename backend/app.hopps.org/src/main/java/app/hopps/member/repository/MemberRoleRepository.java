package app.hopps.member.repository;

import app.hopps.bommel.domain.Bommel;
import app.hopps.member.domain.Member;
import app.hopps.member.domain.MemberRole;
import app.hopps.member.domain.Role;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.List;

@ApplicationScoped
public class MemberRoleRepository implements PanacheRepository<MemberRole> {

    public void assign(Member member, Bommel bommel, Role role) {
        persist(new MemberRole(member, bommel, role));
    }

    /** The roles a member holds on any of the given bommels. */
    public List<Role> rolesOn(Member member, Collection<Long> bommelIds) {
        return getEntityManager()
                .createQuery("select r.role from MemberRole r where r.member = :member and r.bommel.id in :bommelIds",
                        Role.class)
                .setParameter("member", member)
                .setParameter("bommelIds", bommelIds)
                .getResultList();
    }

    public long removeFrom(Member member, Collection<Long> bommelIds) {
        return delete("member = ?1 and bommel.id in ?2", member, bommelIds);
    }
}
