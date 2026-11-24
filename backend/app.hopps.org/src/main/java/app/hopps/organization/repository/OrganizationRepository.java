package app.hopps.organization.repository;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.MemberOrganization;
import app.hopps.member.domain.Role;
import app.hopps.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;

@ApplicationScoped
public class OrganizationRepository implements PanacheRepository<Organization> {

    public Organization findBySlug(String slug) {
        return find("slug", slug).firstResult();
    }

    /**
     * Locks the organization's row until the current transaction ends, so changes to who owns it happen one after the
     * other. Without it, two owners could demote or remove each other at the same moment, each seeing the other as the
     * remaining owner. Needs an open transaction.
     */
    public void lockForOwnerChange(Organization organization) {
        find("id", organization.getId()).withLock(LockModeType.PESSIMISTIC_WRITE).firstResult();
    }

    /**
     * How many owners the organization has besides the given member, as stored: committed changes of other
     * transactions count, the current one's not yet flushed ones do not. Call it after {@link #lockForOwnerChange}.
     */
    public long countOwnersExcept(Organization organization, Member member) {
        return MemberOrganization.count("organization.id = ?1 and role = ?2 and member.id <> ?3",
                organization.getId(), Role.OWNER, member.id);
    }
}
