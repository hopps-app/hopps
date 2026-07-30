-- Replace the flat Category feature with generic Category Groups.
-- The old flat category was never wired into the transaction read/write flow, so no data is migrated.

-- ============================================================
-- Drop the old flat category feature
-- ============================================================
-- transaction.category_id was: bigint references category on delete set null.
-- Dropping the column removes the auto-generated FK constraint as well (Postgres).
alter table transaction drop column category_id;
drop table category;
drop sequence category_seq;

-- ============================================================
-- Category Groups (Hibernate allocationSize = 50, one sequence per entity table)
-- ============================================================
create sequence category_group_seq start with 1 increment by 50;
create sequence category_group_value_seq start with 1 increment by 50;
create sequence transaction_category_value_seq start with 1 increment by 50;

-- A named categorisation axis (e.g. "Kostenstelle", "SKR04-Konto") scoped to one organization.
create table category_group (
    id              bigint       not null primary key,
    organization_id bigint       not null references organization,
    name            varchar(255) not null,
    required        boolean      not null default false
);
create index idx_category_group_org on category_group (organization_id);

-- The allowed values of a group. A group may hold hundreds/thousands of values (whole chart of accounts),
-- so values are always fetched paginated/searched, never all at once.
create table category_group_value (
    id                bigint  not null primary key,
    category_group_id bigint  not null references category_group on delete cascade,
    value             text    not null,
    sort_index        integer not null default 0,
    constraint uk_category_group_value unique (category_group_id, value)
);
create index idx_cgv_group_value on category_group_value (category_group_id, value);
create index idx_cgv_group_sort on category_group_value (category_group_id, sort_index);

-- M:N assignment of a group to bommels. A group applies to a bommel B when an assigned bommel is B or an
-- ANCESTOR of B. An EMPTY assignment set means the group applies to NO bommel; to make it apply to all
-- bommels of the org, assign it to the org's ROOT bommel (inheritance then covers every descendant).
create table category_group_bommel (
    category_group_id bigint not null references category_group on delete cascade,
    bommel_id         bigint not null references bommel on delete cascade,
    constraint pk_category_group_bommel primary key (category_group_id, bommel_id)
);
create index idx_cgb_bommel on category_group_bommel (bommel_id);

-- Historical snapshot of the group values chosen for a transaction. The group is a SOFT reference
-- (ON DELETE SET NULL) and the value is stored as a text snapshot, so deleting a group or a value never
-- loses the record on already-booked transactions.
create table transaction_category_value (
    id                bigint not null primary key,
    transaction_id    bigint not null references transaction on delete cascade,
    category_group_id bigint references category_group on delete set null,
    value             text   not null,
    constraint uk_txn_category_value unique (transaction_id, category_group_id)
);
create index idx_tcv_transaction on transaction_category_value (transaction_id);
