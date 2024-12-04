create sequence Bommel_SEQ start with 1 increment by 50;

create sequence Member_SEQ start with 1 increment by 50;

create sequence Organization_SEQ start with 1 increment by 50;

create table Bommel (
    id bigint not null,
    parent_id bigint,
    responsibleMember_id bigint,
    emoji varchar(255),
    name varchar(255),
    primary key (id)
);

create table Member (
    id bigint not null,
    email varchar(255),
    firstName varchar(255),
    lastName varchar(255),
    primary key (id)
);

create table member_verein (
    member_id bigint not null,
    organizations_id bigint not null
);

create table Organization (
    type smallint check (type between 0 and 0),
    id bigint not null,
    additionalLine varchar(255),
    city varchar(255),
    name varchar(255),
    number varchar(255),
    plz varchar(255),
    profilePicture varchar(255),
    slug varchar(255),
    street varchar(255),
    website varchar(255),
    primary key (id)
);

create index IDX3cfnqqtat0eai35tc6w39vs9q
   on Bommel (parent_id);

alter table if exists Bommel
   add constraint FKplybyvwhfpehgaorna3um5qt2
   foreign key (parent_id)
   references Bommel;

alter table if exists Bommel
   add constraint FKibkd5vds03acqoc102d145g5w
   foreign key (responsibleMember_id)
   references Member;

alter table if exists member_verein
   add constraint FKa6yrrp40bk4pe37m23naxr0yy
   foreign key (organizations_id)
   references Organization;

alter table if exists member_verein
   add constraint FKkt8siyyn76gakg9jqqaj9qd1c
   foreign key (member_id)
   references Member;
