-- Two-level categories: a value can sit under a parent value of the same group. `bookable` says whether a value can be
-- chosen on a transaction (a parent can be a pure collection of its children), `hidden` takes it out of the pickers
-- without touching existing bookings. Deleting a parent moves its children to the top level.
alter table category_group_value
    add column parent_id bigint references category_group_value on delete set null,
    add column bookable  boolean not null default true,
    add column hidden    boolean not null default false;
create index idx_category_group_value_parent on category_group_value (parent_id);

alter table template_category_value
    add column parent_id bigint references template_category_value on delete set null,
    add column bookable  boolean not null default true,
    add column hidden    boolean not null default false;
create index idx_template_category_value_parent on template_category_value (parent_id);

-- Stable id of a template across installations; carried by the export file so that importing the same template again
-- extends the existing group instead of creating a second one.
alter table template_category_group add column source_key varchar(64);
update template_category_group set source_key = gen_random_uuid()::text;
alter table template_category_group alter column source_key set not null;

-- Which template or export file an organization's group came from. Null for a group that was never exported. Not unique:
-- an organization can add the same template more than once.
alter table category_group add column source_key varchar(64);
update category_group g set source_key = t.source_key
    from template_category_group t
    where g.template_id = t.template_id;
create index idx_category_group_source_key on category_group (organization_id, source_key);
