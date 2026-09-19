package app.hopps.member.domain;

import app.hopps.bommel.domain.Bommel;
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
 * The {@link Role} a member holds on a bommel. It covers the bommel's whole subtree, so a role on an organization's
 * root bommel covers the organization. At most one role per member and bommel.
 */
@Entity
@Table(name = "member_role")
public class MemberRole extends PanacheEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "bommel_id")
    private Bommel bommel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Role role;

    protected MemberRole() {
        // for JPA
    }

    public MemberRole(Member member, Bommel bommel, Role role) {
        this.member = member;
        this.bommel = bommel;
        this.role = role;
    }

    public Member getMember() {
        return member;
    }

    public Bommel getBommel() {
        return bommel;
    }

    public Role getRole() {
        return role;
    }
}
