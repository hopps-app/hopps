-- Roles members hold in hopps, independent of the identity provider. A role is granted on a bommel and covers its whole
-- subtree; granted on an organization's root bommel, it covers the organization.
create sequence member_role_seq start with 1 increment by 50;

create table member_role (
    id        bigint      not null primary key,
    member_id bigint      not null references member (id) on delete cascade,
    bommel_id bigint      not null references bommel (id) on delete cascade,
    role      varchar(32) not null,
    constraint uk_member_role_member_bommel unique (member_id, bommel_id)
);

create index idx_member_role_bommel_id on member_role (bommel_id);

-- Existing organizations: the founder is persisted together with the organization, before anyone can be invited, so
-- they are the member with the lowest id and become OWNER. Everyone else was invited and becomes ADMIN, matching the
-- Keycloak realm roles they were given ("Owner" and "org-admin").
insert into member_role (id, member_id, bommel_id, role)
select nextval('member_role_seq'),
       mv.member_id,
       o.rootbommel_id,
       case
           when mv.member_id = (select min(m2.member_id) from member_verein m2 where m2.organizations_id = o.id)
               then 'OWNER'
           else 'ADMIN'
           end
from member_verein mv
         join organization o on o.id = mv.organizations_id
where o.rootbommel_id is not null;