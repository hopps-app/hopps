-- Audit trail of what users change and delete: who did what to which record, when, and what changed.
--
-- Deliberately has no foreign keys, like impersonation_audit: organization, entity and actor are plain copies taken at
-- the moment of the action. The Keycloak id and the e-mail only point at an account and identify nobody once the
-- member is removed, so the member id and the name are copied as well.
--
-- `changes` holds the changed fields as {"field": {"old": ..., "new": ...}} (or the details of a link), `snapshot` the
-- full state for a delete. Rows are never pruned: an audit log that quietly deletes itself is not an audit log. That
-- makes the actor's name and e-mail personal data without a retention rule, which has to be settled before it is
-- documented.
create sequence audit_log_seq start with 1 increment by 50;

create table audit_log (
    id                bigint       not null,
    organization_id   bigint,
    entity_type       varchar(50)  not null,
    entity_id         bigint       not null,
    action            varchar(50)  not null,
    actor_keycloak_id varchar(255),
    actor_email       varchar(255),
    actor_member_id   bigint,
    actor_name        varchar(255),
    occurred_at       timestamptz  not null,
    changes           jsonb,
    snapshot          jsonb,
    primary key (id)
);

create index idx_audit_log_entity on audit_log (entity_type, entity_id, occurred_at desc);
create index idx_audit_log_organization on audit_log (organization_id, occurred_at desc);
