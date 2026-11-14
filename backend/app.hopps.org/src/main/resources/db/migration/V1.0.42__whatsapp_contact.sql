-- People a member invited to send receipts for a bommel via WhatsApp. Hopps sends the invitation itself; the number is
-- connected (ACTIVE) only after the person accepted it in WhatsApp.
create sequence whatsapp_contact_seq start with 1 increment by 50;

create table whatsapp_contact (
    id               bigint       not null primary key,
    bommel_id        bigint       not null references bommel on delete cascade,
    -- digits only, international format without '+', as WhatsApp sends it
    phone_number     varchar(20)  not null,
    -- the name the inviting member typed; used as uploadedBy of the receipts
    name             varchar(255) not null,
    status           varchar(20)  not null,
    -- random token in the invitation's buttons, so an answer is tied to exactly this invitation
    invitation_token varchar(64)  not null,
    invited_by       varchar(255),
    invited_at       timestamptz  not null,
    joined_at        timestamptz,
    constraint whatsapp_contact_status_check check (status in ('INVITED', 'ACTIVE', 'DECLINED')),
    constraint uk_whatsapp_contact_bommel_phone unique (bommel_id, phone_number),
    constraint uk_whatsapp_contact_token unique (invitation_token)
);

create index idx_whatsapp_contact_bommel on whatsapp_contact (bommel_id);
-- A number is connected to at most one bommel.
create unique index uk_whatsapp_contact_active_phone on whatsapp_contact (phone_number) where status = 'ACTIVE';

alter table document drop constraint document_upload_channel_check;
alter table document add constraint document_upload_channel_check
    check (uploadchannel in ('APP', 'UPLOAD_LINK', 'WHATSAPP'));
