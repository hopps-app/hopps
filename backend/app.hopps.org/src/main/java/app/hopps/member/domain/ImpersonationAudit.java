package app.hopps.member.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A record that an administrator assumed a member's identity.
 * <p>
 * Every field is a denormalised copy taken at the moment of the action rather than a relation. Storing the e-mail
 * addresses alongside the ids means the log still says who was involved even once those accounts no longer exist to be
 * joined against.
 */
@Entity
@Table(name = "impersonation_audit")
public class ImpersonationAudit extends PanacheEntity {

    /** Keycloak subject of the administrator who performed the impersonation. */
    @Column(name = "actor_keycloak_id", nullable = false)
    public String actorKeycloakId;

    @Column(name = "actor_email")
    public String actorEmail;

    /** Hopps member id of the impersonated member, kept even if that member is later removed. */
    @Column(name = "target_member_id", nullable = false)
    public Long targetMemberId;

    @Column(name = "target_keycloak_id", nullable = false)
    public String targetKeycloakId;

    @Column(name = "target_email")
    public String targetEmail;

    /** Organization the impersonation was started from, for context. Null if it no longer matters. */
    @Column(name = "organization_id")
    public Long organizationId;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    public static ImpersonationAudit of(String actorKeycloakId, String actorEmail, Member target, Long organizationId,
            Instant createdAt) {
        ImpersonationAudit audit = new ImpersonationAudit();
        audit.actorKeycloakId = actorKeycloakId;
        audit.actorEmail = actorEmail;
        audit.targetMemberId = target.id;
        audit.targetKeycloakId = target.getKeycloakId();
        audit.targetEmail = target.getEmail();
        audit.organizationId = organizationId;
        audit.createdAt = createdAt;
        return audit;
    }
}
