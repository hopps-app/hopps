create sequence trade_party_SEQ start with 1 increment by 50;

-- FIXME: Change this to TradeParty
create table trade_party
(
    id                bigint primary key not null,
    name              varchar(255),
    city              varchar(255),
    country           varchar(255),
    state             varchar(255),
    street            varchar(255),
    additionalAddress varchar(255),
    zipCode           varchar(255),
    taxID             varchar(255),
    vatID             varchar(255),
    description       varchar(255)
);

create sequence TransactionRecord_SEQ start with 1 increment by 50;

create table TransactionRecord
(
    amountDue        numeric(38, 2),
    total            numeric(38, 2) not null,
    bommel_id        bigint,
    dueDate          timestamp(6) with time zone,
    id             bigint primary key not null,
    transaction_time timestamp(6) with time zone,
    document_key   varchar(255)       not null,
    currencyCode     varchar(255),
    invoiceId        varchar(255),
    name             varchar(255),
    orderNumber      varchar(255),
    privately_paid bool     default false,
    document       smallint default 0 not null,
    recipient_id   bigint references trade_party,
    sender_id      bigint references trade_party,
    uploader       varchar(255)
);

create sequence Bommel_SEQ start with 1 increment by 50;

create sequence Member_SEQ start with 1 increment by 50;

create sequence Organization_SEQ start with 1 increment by 50;

create table Member
(
    id        bigint not null primary key,
    email     varchar(255),
    firstName varchar(255),
    lastName  varchar(255)
);

create table Bommel
(
    id                   bigint not null primary key,
    parent_id            bigint references Bommel,
    responsibleMember_id bigint references Member,
    emoji                varchar(255),
    name                 varchar(255)
);

create table Organization
(
    type           smallint check (type between 0 and 0),
    id             bigint not null primary key,
    rootBommel_id  bigint unique references Bommel,
    additionalLine varchar(255),
    city           varchar(255),
    name           varchar(255),
    number         varchar(255),
    plz            varchar(255),
    profilePicture varchar(255),
    slug           varchar(255),
    street         varchar(255),
    website        varchar(255)
);

create table member_verein
(
    member_id        bigint not null references Member,
    organizations_id bigint not null references Organization
);

create index IDX3cfnqqtat0eai35tc6w39vs9q
    on Bommel (parent_id);
