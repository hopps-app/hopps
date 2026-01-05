create table TransactionRecord_tags
(
    TransactionRecord_id bigint not null references TransactionRecord,
    tags                 varchar(255)
);

alter table Member
    add unique (email);
