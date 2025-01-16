create sequence trade_party_sequence start with 1 increment by 1;

create table trade_party
(
    id                bigint not null,
    name              varchar(255),
    city              varchar(255),
    country           varchar(255),
    state             varchar(255),
    street            varchar(255),
    additionalAddress varchar(255),
    zipCode           varchar(255),
    taxID             varchar(255),
    vatID             varchar(255),
    description       varchar(255),
    primary key (id)
);

alter table TransactionRecord
    add column privately_paid bool     default false,
    add column document       smallint default 0 not null,
    add column recipient_id   bigint,
    add column sender_id      bigint,
    add column uploader       varchar(255),

    drop column if exists city,
    drop column if exists country,
    drop column if exists state,
    drop column if exists street,
    drop column if exists streetNumber,
    drop column if exists zipCode,

    add constraint FKc9y0wdh9ohw1q55y03og58o3w foreign key (recipient_id) references trade_party,
    add constraint FK7yhrp9af6kbv73vcry7p4ot98 foreign key (sender_id) references trade_party
;
