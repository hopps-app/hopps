-- Admin monitoring fields for organizations.
-- created_at: when the organization was registered. Existing rows have no historical value,
--   so they are backfilled to now() at migration time; new rows are stamped by Hibernate (@CreationTimestamp).
-- deleted_at: soft-delete marker. NULL means active; a timestamp means the org is soft-deleted
--   and is hidden from all normal queries via @SQLRestriction("deleted_at is null").
alter table organization
    add column created_at timestamptz not null default now();

alter table organization
    add column deleted_at timestamptz;
