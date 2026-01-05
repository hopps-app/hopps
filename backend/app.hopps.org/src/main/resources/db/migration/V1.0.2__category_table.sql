create sequence Category_SEQ start with 1 increment by 1;

create table Category
(
    id              bigint not null primary key,
    organization_id bigint not null references Organization,
    name            varchar(127) not null,
    description     varchar(255)
);