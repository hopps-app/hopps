-- WhatsApp invite of a bommel: a short code that connects a phone number to the bommel via the chatbot. Like the
-- upload link, a bommel has at most one invite; regenerating replaces the row, so the old code stops working.
create sequence whatsapp_invite_seq start with 1 increment by 50;

create table whatsapp_invite (
    id         bigint       not null primary key,
    bommel_id  bigint       not null references bommel on delete cascade,
    code       varchar(16)  not null,
    expires_at timestamptz,
    created_at timestamptz  not null,
    created_by varchar(255),
    constraint uk_whatsapp_invite_bommel unique (bommel_id),
    constraint uk_whatsapp_invite_code unique (code)
);

-- A phone number that joined a bommel through its invite. A number belongs to exactly one bommel; joining another
-- bommel moves it. Survives regenerating the invite, removed when the invite is revoked.
create sequence whatsapp_contact_seq start with 1 increment by 50;

create table whatsapp_contact (
    id           bigint       not null primary key,
    -- digits only, international format without '+', as WhatsApp sends it
    phone_number varchar(20)  not null,
    display_name varchar(255),
    bommel_id    bigint       not null references bommel on delete cascade,
    joined_at    timestamptz  not null,
    constraint uk_whatsapp_contact_phone unique (phone_number)
);

create index idx_whatsapp_contact_bommel on whatsapp_contact (bommel_id);

alter table document drop constraint document_upload_channel_check;
alter table document add constraint document_upload_channel_check
    check (uploadchannel in ('APP', 'UPLOAD_LINK', 'WHATSAPP'));
