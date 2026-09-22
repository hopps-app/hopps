package app.hopps.member.domain;

import app.hopps.organization.domain.Organization;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * A member's membership in an organization ({@code member_verein}), and the {@link Role} that comes with it.
 * {@link Member} owns this side of the relationship, so persisting a member is what writes new rows.
 * <p>
 * The role is organization-wide for now.
 */
@Entity
@Table(name = "member_verein")
public class MemberOrganization extends PanacheEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "organizations_id")
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Role role;

    protected MemberOrganization() {
        // for JPA
    }

    public MemberOrganization(Member member, Organization organization, Role role) {
        this.member = member;
        this.organization = organization;
        this.role = role;
    }

    public Member getMember() {
        return member;
    }

    public Organization getOrganization() {
        return organization;
    }

    public Role getRole() {
        return role;
    }
}
