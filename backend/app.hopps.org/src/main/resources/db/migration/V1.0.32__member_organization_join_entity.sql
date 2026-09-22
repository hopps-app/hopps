-- member_verein was a plain Hibernate @ManyToMany join table (no primary key of its own). Turning the membership into
-- an explicit entity (MemberOrganization) needs a real id, and a unique constraint guards against duplicate rows now
-- that application code can insert into this table directly instead of only through collection bookkeeping.
create sequence member_verein_seq start with 1 increment by 50;

alter table member_verein
    add column id bigint;

update member_verein
set id = nextval('member_verein_seq')
where id is null;

alter table member_verein
    alter column id set not null,
    add primary key (id);

alter table member_verein
    add constraint uk_member_verein_member_org unique (member_id, organizations_id);
