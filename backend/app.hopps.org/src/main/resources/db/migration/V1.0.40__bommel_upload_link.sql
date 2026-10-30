-- A bommel can have one public upload link. Anyone with the link can submit receipts for that bommel without an
-- account; the token is random and not guessable. Regenerating replaces the row, so the old token stops working.
create sequence bommel_upload_link_seq start with 1 increment by 50;

create table bommel_upload_link (
    id         bigint       not null primary key,
    bommel_id  bigint       not null references bommel on delete cascade,
    token      varchar(64)  not null,
    expires_at timestamptz,
    created_at timestamptz  not null,
    created_by varchar(255),
    constraint uk_bommel_upload_link_bommel unique (bommel_id),
    constraint uk_bommel_upload_link_token unique (token)
);

-- How a document got into hopps, and the note a submitter left on the upload-link page.
alter table document add column uploadchannel varchar(20) not null default 'APP';
alter table document add constraint document_upload_channel_check check (uploadchannel in ('APP', 'UPLOAD_LINK'));
alter table document add column uploadercomment text;
