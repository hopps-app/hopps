create table TransactionRecord_tags
(
    TransactionRecord_id bigint not null references TransactionRecord,
    tags                 varchar(255)
);
