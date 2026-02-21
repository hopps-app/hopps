-- Hopps Organization Service - Complete Database Schema
-- Single migration setting up the full schema from scratch.

-- ============================================================
-- SEQUENCES (Hibernate allocationSize = 50)
-- ============================================================

create sequence member_seq start with 1 increment by 50;
create sequence bommel_seq start with 1 increment by 50;
create sequence organization_seq start with 1 increment by 50;
create sequence trade_party_seq start with 1 increment by 50;
create sequence category_seq start with 1 increment by 50;
create sequence tag_seq start with 1 increment by 50;
create sequence document_seq start with 1 increment by 50;
create sequence document_tag_seq start with 1 increment by 50;
create sequence transaction_seq start with 1 increment by 50;

-- ============================================================
-- TABLES
-- ============================================================

-- Member: Users of the system
create table member (
    id        bigint       not null primary key,
    firstname varchar(255) not null,
    lastname  varchar(255) not null,
    email     varchar(255) not null unique
);

-- Bommel: Hierarchical tree structure for organizational units
create table bommel (
    id                   bigint not null primary key,
    name                 varchar(255),
    emoji                varchar(255),
    parent_id            bigint references bommel,
    responsiblemember_id bigint references member
);

create index idx_bommel_parent_id on bommel (parent_id);

-- Organization: Main entity for Vereine (non-profit organizations)
create table organization (
    id                 bigint   not null primary key,
    name               varchar(255) not null,
    slug               varchar(255) not null,
    type               smallint not null check (type between 0 and 1),
    street             varchar(255),
    number             varchar(255),
    city               varchar(255),
    plz                varchar(255),
    additionalline     varchar(255),
    rootbommel_id      bigint unique references bommel,
    website            varchar(255),
    profilepicture     varchar(255),
    foundingdate       date,
    registrationcourt  varchar(255),
    registrationnumber varchar(255),
    country            varchar(255),
    taxnumber          varchar(255),
    email              varchar(255),
    phonenumber        varchar(255)
);

-- Member-Organization join table (many-to-many)
create table member_verein (
    member_id        bigint not null references member,
    organizations_id bigint not null references organization
);

-- TradeParty: Sender/recipient on documents and transactions
create table trade_party (
    id                bigint not null primary key,
    organization_id   bigint not null references organization,
    name              varchar(255),
    street            varchar(255),
    additionaladdress varchar(255),
    zipcode           varchar(255),
    city              varchar(255),
    state             varchar(255),
    country           varchar(255),
    taxid             varchar(255),
    vatid             varchar(255)
);

-- Category: Categorization system for transactions
create table category (
    id              bigint       not null primary key,
    organization_id bigint       not null references organization,
    name            varchar(255) not null,
    description     varchar(255)
);

-- Tag: Named tags for documents, scoped per organization
create table tag (
    id              bigint       not null primary key,
    organization_id bigint       not null references organization,
    name            varchar(255) not null,
    constraint uk_tag_org_name unique (organization_id, name)
);

-- Document: Uploaded files with AI analysis results
create table document (
    id               bigint  not null primary key,
    organization_id  bigint  not null references organization,
    bommel_id        bigint  references bommel,
    sender_id        bigint  references trade_party,
    recipient_id     bigint  references trade_party,
    name             varchar(255),
    total            numeric(38, 2),
    totaltax         numeric(38, 2),
    currencycode     varchar(255),
    transactiontime  timestamp(6) with time zone,
    privatelypaid    boolean not null default false,
    filekey          varchar(255),
    filename         varchar(255),
    filecontenttype  varchar(255),
    filesize         bigint,
    documentstatus   varchar(255) check (documentstatus in ('UPLOADED', 'ANALYZING', 'ANALYZED', 'CONFIRMED', 'FAILED')),
    analysisstatus   varchar(255) check (analysisstatus in ('PENDING', 'ANALYZING', 'COMPLETED', 'FAILED', 'SKIPPED')),
    analysiserror    text,
    extractionsource varchar(255) check (extractionsource in ('ZUGFERD', 'AI', 'MANUAL')),
    uploadedby       varchar(255),
    analyzedby       varchar(255),
    reviewedby       varchar(255),
    createdat        timestamp(6) with time zone not null default now()
);

-- DocumentTag: Links documents to tags with source metadata
create table document_tag (
    id          bigint not null primary key,
    document_id bigint not null references document,
    tag_id      bigint not null references tag,
    source      varchar(255) check (source in ('AI', 'MANUAL')),
    constraint uk_document_tag unique (document_id, tag_id)
);

-- Transaction: Financial transactions entered by users
create table transaction (
    id               bigint       not null primary key,
    organization_id  bigint       not null references organization,
    bommel_id        bigint       references bommel,
    document_id      bigint       references document,
    category_id      bigint       references category on delete set null,
    sender_id        bigint       references trade_party,
    recipient_id     bigint       references trade_party,
    name             varchar(255),
    total            numeric(38, 2),
    totaltax         numeric(38, 2),
    currencycode     varchar(255),
    transaction_time timestamp(6) with time zone,
    duedate          timestamp(6) with time zone,
    amountdue        numeric(38, 2),
    invoiceid        varchar(255),
    ordernumber      varchar(255),
    privately_paid   boolean      not null default false,
    area             varchar(255) check (area in ('IDEELL', 'ZWECKBETRIEB', 'VERMOEGENSVERWALTUNG', 'WIRTSCHAFTLICH')),
    status           varchar(255) default 'DRAFT' check (status in ('DRAFT', 'CONFIRMED')),
    created_by       varchar(255) not null,
    document_key     varchar(255),
    created_at       timestamp(6) with time zone not null default now(),
    updated_at       timestamp(6) with time zone
);

-- Transaction tags (element collection)
create table transaction_tags (
    transaction_id bigint not null references transaction,
    tags           varchar(255)
);
