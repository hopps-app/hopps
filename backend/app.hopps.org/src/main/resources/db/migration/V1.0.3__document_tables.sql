-- Document management tables

-- TradeParty table (for sender/recipient on documents)
create table TradeParty (
    id bigint not null,
    name varchar(255),
    street varchar(255),
    additionalAddress varchar(255),
    zipCode varchar(255),
    city varchar(255),
    state varchar(255),
    country varchar(255),
    taxId varchar(255),
    vatId varchar(255),
    organization_id bigint not null,
    primary key (id),
    constraint FK_tradeparty_organization foreign key (organization_id) references Organization
);

create sequence TradeParty_SEQ start with 1 increment by 50;

-- Tag table
create table Tag (
    id bigint not null,
    name varchar(255) not null,
    organization_id bigint not null,
    primary key (id),
    constraint FK_tag_organization foreign key (organization_id) references Organization,
    constraint UK_tag_org_name unique (organization_id, name)
);

create sequence Tag_SEQ start with 1 increment by 50;

-- Document table
create table Document (
    id bigint not null,
    fileName varchar(255),
    fileKey varchar(255),
    fileContentType varchar(255),
    fileSize bigint,
    name varchar(255),
    total numeric(38,2),
    totalTax numeric(38,2),
    currencyCode varchar(255),
    transactionTime timestamp(6) with time zone,
    privatelyPaid boolean not null default false,
    documentType varchar(255) check (documentType in ('RECEIPT','INVOICE')),
    documentStatus varchar(255) check (documentStatus in ('UPLOADED','ANALYZING','ANALYZED','CONFIRMED','FAILED')),
    analysisStatus varchar(255) check (analysisStatus in ('PENDING','ANALYZING','COMPLETED','FAILED','SKIPPED')),
    analysisError varchar(255),
    extractionSource varchar(255) check (extractionSource in ('ZUGFERD','AI','MANUAL')),
    uploadedBy varchar(255),
    analyzedBy varchar(255),
    reviewedBy varchar(255),
    createdAt timestamp(6) with time zone not null default now(),
    organization_id bigint not null,
    bommel_id bigint,
    sender_id bigint,
    recipient_id bigint,
    primary key (id),
    constraint FK_document_organization foreign key (organization_id) references Organization,
    constraint FK_document_bommel foreign key (bommel_id) references Bommel,
    constraint FK_document_sender foreign key (sender_id) references TradeParty,
    constraint FK_document_recipient foreign key (recipient_id) references TradeParty
);

create sequence Document_SEQ start with 1 increment by 50;

-- Document-Tag join table
create table document_tag (
    id bigint not null,
    document_id bigint not null,
    tag_id bigint not null,
    source varchar(255) check (source in ('AI','MANUAL')),
    primary key (id),
    constraint FK_doctag_document foreign key (document_id) references Document,
    constraint FK_doctag_tag foreign key (tag_id) references Tag,
    constraint UK_doctag_document_tag unique (document_id, tag_id)
);

create sequence document_tag_SEQ start with 1 increment by 50;
