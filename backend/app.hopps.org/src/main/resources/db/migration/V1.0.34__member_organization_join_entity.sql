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

-- The original foreign keys from V1.0.0 had no ON DELETE action, which was harmless while this was a plain join table
-- that Hibernate maintained through collection bookkeeping. Now that rows are entities in their own right, a membership
-- has to go with its member or organization at the database level too: bulk deletes (Panache deleteAll, test fixtures)
-- do not cascade through JPA and would otherwise fail on this constraint.
alter table member_verein
    drop constraint member_verein_member_id_fkey,
    add constraint member_verein_member_id_fkey foreign key (member_id) references member (id) on delete cascade;

alter table member_verein
    drop constraint member_verein_organizations_id_fkey,
    add constraint member_verein_organizations_id_fkey foreign key (organizations_id) references organization (id) on delete cascade;
