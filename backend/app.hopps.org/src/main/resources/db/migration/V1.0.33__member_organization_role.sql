-- Role moves from being bommel-scoped (member_role, added in V1.0.31) to organization-scoped, directly on the
-- membership row (member_verein). A bommel-level override can still be added later as a separate, more specific grant
-- layered on top of this organization-wide default — see AccessService — without touching this column again.
alter table member_verein
    add column role varchar(32);

update member_verein mv
set role = coalesce(
        (select mr.role
         from member_role mr
                  join organization o on o.rootbommel_id = mr.bommel_id
         where mr.member_id = mv.member_id
           and o.id = mv.organizations_id),
        'ADMIN');

alter table member_verein
    alter column role set not null;

drop table member_role;
drop sequence member_role_seq;
