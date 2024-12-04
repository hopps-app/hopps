
    create sequence TransactionRecord_SEQ start with 1 increment by 50;

    create table TransactionRecord (
        id bigint not null,
        primary key (id)
    );
