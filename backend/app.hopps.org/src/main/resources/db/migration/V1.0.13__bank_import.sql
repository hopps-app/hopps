-- Bank import feature: bank accounts, CSV mapping schemas, imports, and transactions.
-- See bank-import-feature.md (project root) for the full feature spec.

-- ============================================================================
-- 1. CSV mapping schema (reusable per organization)
-- ============================================================================
create table BankCsvSchema (
    id bigint not null,
    organization_id bigint not null,
    name varchar(255) not null,
    bankIdentifier varchar(255),
    delimiter char(1) not null default ';',
    quoteChar char(1) not null default '"',
    encoding varchar(50) not null default 'UTF-8',
    skipLines integer not null default 0,
    hasHeader boolean not null default true,
    dateFormat varchar(50) not null default 'dd.MM.yyyy',
    decimalSeparator char(1) not null default ',',
    thousandSeparator char(1),
    amountStrategy varchar(50) not null default 'SIGNED_SINGLE_COLUMN'
        check (amountStrategy in ('SIGNED_SINGLE_COLUMN', 'DEBIT_CREDIT_COLUMNS', 'AMOUNT_PLUS_TYPE_COLUMN')),
    amountTypePositiveValues text,
    archived boolean not null default false,
    archivedAt timestamp(6) with time zone,
    createdBy varchar(255) not null,
    createdAt timestamp(6) with time zone not null default now(),
    updatedAt timestamp(6) with time zone,
    primary key (id),
    constraint FK_bankcsvschema_organization foreign key (organization_id) references Organization
);

create sequence BankCsvSchema_SEQ start with 1 increment by 50;

create index IX_bankcsvschema_org on BankCsvSchema(organization_id);

-- ============================================================================
-- 2. Column mappings (sub-table of BankCsvSchema)
-- ============================================================================
create table BankCsvColumnMapping (
    id bigint not null,
    schema_id bigint not null,
    targetField varchar(50) not null
        check (targetField in (
            'BOOKING_DATE', 'VALUE_DATE', 'AMOUNT', 'DEBIT_AMOUNT', 'CREDIT_AMOUNT',
            'AMOUNT_TYPE_INDICATOR', 'CURRENCY', 'PURPOSE', 'COUNTERPARTY_NAME',
            'COUNTERPARTY_IBAN', 'COUNTERPARTY_BIC', 'TRANSACTION_TYPE', 'BANK_REFERENCE',
            'BALANCE_AFTER', 'END_TO_END_REFERENCE', 'MANDATE_REFERENCE', 'CREDITOR_ID'
        )),
    sourceColumnIndex integer,
    sourceColumnName varchar(255),
    transform varchar(255),
    primary key (id),
    constraint FK_bankcsvcolmap_schema foreign key (schema_id) references BankCsvSchema on delete cascade,
    constraint UK_bankcsvcolmap_schema_field unique (schema_id, targetField)
);

create sequence BankCsvColumnMapping_SEQ start with 1 increment by 50;

-- ============================================================================
-- 3. Bank account
-- ============================================================================
create table BankAccount (
    id bigint not null,
    organization_id bigint not null,
    bommel_id bigint not null,
    name varchar(255) not null,
    iban varchar(34) not null,
    bic varchar(11),
    bankName varchar(255),
    accountHolder varchar(255),
    currency varchar(3) not null default 'EUR',
    openingBalance numeric(38, 2),
    openingBalanceDate date,
    description text,
    color varchar(20),
    defaultSchema_id bigint,
    archived boolean not null default false,
    archivedAt timestamp(6) with time zone,
    createdBy varchar(255) not null,
    createdAt timestamp(6) with time zone not null default now(),
    updatedAt timestamp(6) with time zone,
    primary key (id),
    constraint FK_bankaccount_organization foreign key (organization_id) references Organization,
    constraint FK_bankaccount_bommel foreign key (bommel_id) references Bommel,
    constraint FK_bankaccount_defaultschema foreign key (defaultSchema_id) references BankCsvSchema
);

create sequence BankAccount_SEQ start with 1 increment by 50;

create index IX_bankaccount_org on BankAccount(organization_id);
create index IX_bankaccount_bommel on BankAccount(bommel_id);
create index IX_bankaccount_archived on BankAccount(organization_id, archived);

-- ============================================================================
-- 4. Bank import (audit + async job record)
-- ============================================================================
create table BankImport (
    id bigint not null,
    organization_id bigint not null,
    bankAccount_id bigint not null,
    schema_id bigint not null,
    fileName varchar(255) not null,
    fileSize bigint not null,
    fileSha256 varchar(64) not null,
    s3FileKey varchar(512),
    importedBy varchar(255) not null,
    importedAt timestamp(6) with time zone not null default now(),
    startedAt timestamp(6) with time zone,
    finishedAt timestamp(6) with time zone,
    status varchar(20) not null default 'QUEUED'
        check (status in ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL')),
    progress integer not null default 0,
    totalRows integer not null default 0,
    importedRows integer not null default 0,
    duplicateRows integer not null default 0,
    errorRows integer not null default 0,
    errorReport text,
    failureReason varchar(512),
    primary key (id),
    constraint FK_bankimport_organization foreign key (organization_id) references Organization,
    constraint FK_bankimport_bankaccount foreign key (bankAccount_id) references BankAccount,
    constraint FK_bankimport_schema foreign key (schema_id) references BankCsvSchema
);

create sequence BankImport_SEQ start with 1 increment by 50;

create index IX_bankimport_account_status on BankImport(bankAccount_id, status);
create index IX_bankimport_status_queued on BankImport(status) where status = 'QUEUED';

-- ============================================================================
-- 5. Bank transaction (parsed from CSV)
-- ============================================================================
create table BankTransaction (
    id bigint not null,
    organization_id bigint not null,
    bankAccount_id bigint not null,
    import_id bigint not null,
    bookingDate date not null,
    valueDate date,
    amount numeric(38, 2) not null,
    currency varchar(3) not null default 'EUR',
    purpose text,
    counterpartyName varchar(512),
    counterpartyIban varchar(34),
    counterpartyBic varchar(11),
    transactionType varchar(255),
    bankReference varchar(255),
    endToEndReference varchar(255),
    mandateReference varchar(255),
    creditorId varchar(255),
    balanceAfter numeric(38, 2),
    rawRow text,
    dedupeHash varchar(64) not null,
    status varchar(20) not null default 'UNMATCHED'
        check (status in ('UNMATCHED', 'PARTIALLY_MATCHED', 'FULLY_MATCHED', 'IGNORED')),
    matchedAmount numeric(38, 2) not null default 0,
    createdAt timestamp(6) with time zone not null default now(),
    primary key (id),
    constraint FK_banktx_organization foreign key (organization_id) references Organization,
    constraint FK_banktx_bankaccount foreign key (bankAccount_id) references BankAccount,
    constraint FK_banktx_import foreign key (import_id) references BankImport,
    constraint UK_banktx_account_dedupe unique (bankAccount_id, dedupeHash)
);

create sequence BankTransaction_SEQ start with 1 increment by 50;

create index IX_banktx_account_date on BankTransaction(bankAccount_id, bookingDate desc);
create index IX_banktx_account_status on BankTransaction(bankAccount_id, status);
create index IX_banktx_org_date on BankTransaction(organization_id, bookingDate desc);

-- ============================================================================
-- 6. Bank transaction match (Phase 2 — N:M between BankTransaction and Transaction)
-- Schema is created in MVP so no migration is needed when reconciliation lands.
-- ============================================================================
create table BankTransactionMatch (
    id bigint not null,
    bankTransaction_id bigint not null,
    transaction_id bigint not null,
    matchedAmount numeric(38, 2) not null,
    matchType varchar(20) not null default 'MANUAL'
        check (matchType in ('MANUAL', 'AUTO_RULE', 'AUTO_AI')),
    matchedBy varchar(255) not null,
    matchedAt timestamp(6) with time zone not null default now(),
    notes text,
    primary key (id),
    constraint FK_banktxmatch_banktx foreign key (bankTransaction_id) references BankTransaction on delete cascade,
    constraint FK_banktxmatch_transaction foreign key (transaction_id) references Transaction on delete cascade
);

create sequence BankTransactionMatch_SEQ start with 1 increment by 50;

create index IX_banktxmatch_banktx on BankTransactionMatch(bankTransaction_id);
create index IX_banktxmatch_transaction on BankTransactionMatch(transaction_id);
