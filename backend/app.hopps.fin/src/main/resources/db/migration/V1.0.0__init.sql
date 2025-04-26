create sequence TransactionRecord_SEQ start with 1 increment by 50;

create table TransactionRecord
(
    amountDue        numeric(38, 2),
    total            numeric(38, 2) not null,
    bommel_id        bigint,
    dueDate          timestamp(6) with time zone,
    id               bigint         not null,
    transaction_time timestamp(6) with time zone,
    document_key     varchar(255)   not null,
    city             varchar(255),
    country          varchar(255),
    currencyCode     varchar(255),
    invoiceId        varchar(255),
    name             varchar(255),
    orderNumber      varchar(255),
    state            varchar(255),
    street           varchar(255),
    streetNumber     varchar(255),
    zipCode          varchar(255),
    primary key (id)
);
