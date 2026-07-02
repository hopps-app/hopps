-- "Last modified" timestamp for documents, kept in sync by Hibernate @UpdateTimestamp.
alter table document
    add column updatedat timestamp(6) with time zone;

-- Backfill existing rows so sorting by "updated" is sensible from the start.
update document set updatedat = createdat where updatedat is null;
