package app.hopps.audit.service;

import app.hopps.audit.domain.AuditAction;
import app.hopps.audit.domain.AuditEntityType;
import app.hopps.audit.domain.AuditLog;
import app.hopps.member.domain.Member;
import app.hopps.shared.security.KeycloakPrincipals;
import app.hopps.shared.security.OrganizationContext;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.context.ContextNotActiveException;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.security.Principal;
import java.time.Instant;
import java.util.Map;

/**
 * Writes the audit trail: what a user changed or deleted. Entries are added to the caller's transaction, so an action
 * and its audit entry stand or fall together; a failed request leaves no entry behind.
 * <p>
 * This is the part that is the same for every entity. What is specific to one entity lives in its
 * {@link EntityAuditor}, which is what callers use.
 */
@ApplicationScoped
public class AuditService {

    private static final Logger LOG = LoggerFactory.getLogger(AuditService.class);

    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    OrganizationContext organizationContext;

    public <T> void created(EntityAuditor<T> auditor, T entity) {
        record(auditor.entityType(), auditor.organizationId(entity), auditor.entityId(entity), AuditAction.CREATE, null,
                auditor.snapshot(entity));
    }

    /** Records the fields that differ from {@code before}; nothing is written when none does. */
    public <T> void updated(EntityAuditor<T> auditor, T entity, Map<String, Object> before) {
        Map<String, Object> changes = AuditDiff.diff(before, auditor.snapshot(entity));
        if (!changes.isEmpty()) {
            record(auditor.entityType(), auditor.organizationId(entity), auditor.entityId(entity), AuditAction.UPDATE,
                    changes, null);
        }
    }

    /** Records a deletion with the state the entity had; call it before the entity is removed. */
    public <T> void deleted(EntityAuditor<T> auditor, T entity, Map<String, Object> snapshot) {
        record(auditor.entityType(), auditor.organizationId(entity), auditor.entityId(entity), AuditAction.DELETE, null,
                snapshot);
    }

    /** Writes one entry; for the actions that only one kind of entity has. */
    public void record(AuditEntityType entityType, Long organizationId, Long entityId, AuditAction action,
            Map<String, Object> changes, Map<String, Object> snapshot) {
        Principal actor = currentActor();

        AuditLog entry = new AuditLog();
        entry.organizationId = organizationId;
        entry.entityType = entityType;
        entry.entityId = entityId;
        entry.action = action;
        entry.actorKeycloakId = actor == null ? null : KeycloakPrincipals.keycloakId(actor);
        // The principal name is the e-mail (see KeycloakPrincipals), kept next to the immutable id.
        entry.actorEmail = actor == null ? null : actor.getName();
        Member member = actor == null ? null : currentMember();
        entry.actorMemberId = member == null ? null : member.id;
        entry.actorName = member == null ? null : fullName(member);
        entry.occurredAt = Instant.now();
        entry.changes = changes;
        entry.snapshot = snapshot;
        entry.persist();

        // No actor in the log line: it would put the e-mail address into the application log.
        LOG.info("Audit: entityType={}, action={}, entityId={}", entityType, action, entityId);
    }

    /** The member behind the current request, or null without one. */
    private Member currentMember() {
        try {
            return organizationContext.getCurrentMember();
        } catch (ContextNotActiveException e) {
            return null;
        }
    }

    private static String fullName(Member member) {
        String name = ((member.getFirstName() == null ? "" : member.getFirstName()) + " "
                + (member.getLastName() == null ? "" : member.getLastName())).trim();
        return name.isEmpty() ? null : name;
    }

    /** The user behind the current request, or null without one (anonymous, or outside a request). */
    private Principal currentActor() {
        try {
            return securityIdentity.isAnonymous() ? null : securityIdentity.getPrincipal();
        } catch (ContextNotActiveException e) {
            return null;
        }
    }
}
