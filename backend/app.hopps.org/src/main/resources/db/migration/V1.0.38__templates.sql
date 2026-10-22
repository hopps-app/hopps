-- Platform-wide templates, maintained by Hopps admins in the admin app. An organization copies a template into its
-- own data (e.g. a template becomes a real category_group); the copy is owned by the organization from then on, so
-- editing or deleting a template never touches organization data.
--
-- `template` holds what every template type shares. Each type adds its own table keyed by template_id (JPA JOINED
-- inheritance, discriminated by `type`). Category groups are the first type.
create sequence template_seq start with 1 increment by 50;
create sequence template_category_value_seq start with 1 increment by 50;

create table template (
    id          bigint       not null primary key,
    type        varchar(40)  not null,
    name        varchar(255) not null,
    description text,
    active      boolean      not null default true,
    sort_index  integer      not null default 0,
    created_at  timestamptz  not null,
    updated_at  timestamptz
);
create index idx_template_type on template (type, sort_index);

-- A category group template: the group's settings plus its values (copied 1:1 into category_group_value).
create table template_category_group (
    template_id bigint  not null primary key references template on delete cascade,
    required    boolean not null default false
);

create table template_category_value (
    id          bigint  not null primary key,
    template_id bigint  not null references template_category_group on delete cascade,
    value       text    not null,
    sort_index  integer not null default 0,
    constraint uk_template_category_value unique (template_id, value)
);
create index idx_tcv_template_sort on template_category_value (template_id, sort_index);

-- Where an organization's group came from. Soft reference: deleting a template keeps the organization's copy.
alter table category_group add column template_id bigint references template on delete set null;
create index idx_category_group_template on category_group (organization_id, template_id);
