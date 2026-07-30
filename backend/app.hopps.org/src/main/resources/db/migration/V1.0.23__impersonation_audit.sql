-- Audit trail for admin impersonation: who assumed whose identity, when, and in which organization.
--
-- Deliberately has no foreign keys. An audit record must outlive its subject: if the member or the
-- organization is deleted afterwards, the fact that somebody impersonated them is precisely what an audit
-- log exists to preserve, and a cascade would erase it. The identifiers and e-mail addresses are therefore
-- denormalised copies, correct as of the moment of the action rather than joins that can vanish or silently
-- change underneath the record.
--
-- Rows are never pruned. Impersonation is rare (a support action, not traffic), so the table stays small
-- without a retention job, and an audit log that quietly deletes itself is not an audit log.
create sequence impersonation_audit_seq start with 1 increment by 50;

create table impersonation_audit (
    id                 bigint       not null,
    actor_keycloak_id  varchar(255) not null,
    actor_email        varchar(255),
    target_member_id   bigint       not null,
    target_keycloak_id varchar(255) not null,
    target_email       varchar(255),
    organization_id    bigint,
    created_at         timestamptz  not null,
    primary key (id)
);

create index idx_impersonation_audit_created on impersonation_audit (created_at desc);
