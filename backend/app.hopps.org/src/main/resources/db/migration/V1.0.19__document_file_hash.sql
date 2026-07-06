-- Store the SHA-256 hash of the uploaded file content so duplicate uploads (the same receipt file) can be rejected.
-- Unique per organization; NULL is allowed for pre-existing documents and never conflicts (multiple NULLs are permitted).
alter table document
    add column filehash varchar(64);

alter table document
    add constraint uq_document_org_filehash unique (organization_id, filehash);
