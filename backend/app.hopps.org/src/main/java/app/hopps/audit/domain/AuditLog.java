package app.hopps.audit.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

/**
 * One entry of the audit trail: a user changed or deleted something.
 * <p>
 * Every field is a denormalised copy taken at the moment of the action rather than a relation, so the entry stays
 * correct and readable after the record, the organization or the account it mentions is gone (see
 * {@code V1.0.31__audit_log.sql}).
 */
@Entity
@Table(name = "audit_log")
public class AuditLog extends PanacheEntity {

    /** Organization the record belonged to; null if it had none. */
    @Column(name = "organization_id")
    public Long organizationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false)
    public AuditEntityType entityType;

    @Column(name = "entity_id", nullable = false)
    public Long entityId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public AuditAction action;

    /** Keycloak subject of the acting user; null when there was no user (e.g. a background job). */
    @Column(name = "actor_keycloak_id")
    public String actorKeycloakId;

    @Column(name = "actor_email")
    public String actorEmail;

    /**
     * The acting user as a member, and their name, both as they were at that moment. The Keycloak id and the e-mail
     * only point at an account; once the member is removed they identify nobody, so the entry carries the person
     * itself.
     */
    @Column(name = "actor_member_id")
    public Long actorMemberId;

    @Column(name = "actor_name")
    public String actorName;

    @Column(name = "occurred_at", nullable = false)
    public Instant occurredAt;

    /** Changed fields as {@code field -> {old, new}}, or the details of a link. Null when there is nothing to list. */
    @JdbcTypeCode(SqlTypes.JSON)
    public Map<String, Object> changes;

    /** Full state of the record: set on create and on delete. */
    @JdbcTypeCode(SqlTypes.JSON)
    public Map<String, Object> snapshot;
}
