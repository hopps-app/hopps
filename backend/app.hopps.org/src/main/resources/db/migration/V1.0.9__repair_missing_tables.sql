-- REPAIR MIGRATION: Fix missing tables from V1.0.2 and V1.0.3
--
-- Issue: Migrations V1.0.2-V1.0.8 were marked as "applied" in flyway_schema_history
-- with execution_time=0, but the DDL statements never actually executed.
-- Only CREATE SEQUENCE statements ran; CREATE TABLE statements failed/rolled back.
--
-- This migration creates the missing tables if they don't exist.

-- V1.0.2: Category table
CREATE TABLE IF NOT EXISTS Category (
    id bigint not null primary key,
    organization_id bigint not null references Organization,
    name varchar(127) not null,
    description varchar(255)
);

-- V1.0.3: Document-related tables
CREATE TABLE IF NOT EXISTS Tag (
    id bigint not null primary key,
    name varchar(255) not null,
    organization_id bigint not null references Organization,
    constraint UK_tag_org_name unique (organization_id, name)
);

CREATE TABLE IF NOT EXISTS Document (
    id bigint not null primary key,
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
    documentStatus varchar(255),
    analysisStatus varchar(255),
    analysisError varchar(255),
    extractionSource varchar(255),
    uploadedBy varchar(255),
    analyzedBy varchar(255),
    reviewedBy varchar(255),
    createdAt timestamp(6) with time zone not null default now(),
    organization_id bigint not null references Organization,
    bommel_id bigint references Bommel,
    sender_id bigint references trade_party,
    recipient_id bigint references trade_party
);

CREATE TABLE IF NOT EXISTS document_tag (
    id bigint not null primary key,
    document_id bigint not null references Document,
    tag_id bigint not null references Tag,
    source varchar(255),
    constraint UK_doctag_document_tag unique (document_id, tag_id)
);

-- V1.0.5: Transaction refactor (idempotent operations)
DO $$
BEGIN
    -- Rename transactionrecord to transaction if needed
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'transactionrecord') THEN
        ALTER TABLE transactionrecord RENAME TO transaction;
    END IF;

    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transaction' AND column_name = 'organization_id') THEN
        ALTER TABLE transaction ADD COLUMN organization_id bigint;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transaction' AND column_name = 'document_id') THEN
        ALTER TABLE transaction ADD COLUMN document_id bigint;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transaction' AND column_name = 'category_id') THEN
        ALTER TABLE transaction ADD COLUMN category_id bigint;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transaction' AND column_name = 'area') THEN
        ALTER TABLE transaction ADD COLUMN area varchar(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transaction' AND column_name = 'status') THEN
        ALTER TABLE transaction ADD COLUMN status varchar(20) DEFAULT 'DRAFT';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transaction' AND column_name = 'totaltax') THEN
        ALTER TABLE transaction ADD COLUMN totalTax numeric(38,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transaction' AND column_name = 'created_at') THEN
        ALTER TABLE transaction ADD COLUMN created_at timestamp(6) with time zone DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transaction' AND column_name = 'updated_at') THEN
        ALTER TABLE transaction ADD COLUMN updated_at timestamp(6) with time zone;
    END IF;

    -- Add foreign key constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transaction_organization') THEN
        ALTER TABLE transaction ADD CONSTRAINT FK_transaction_organization FOREIGN KEY (organization_id) REFERENCES Organization(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transaction_document') THEN
        ALTER TABLE transaction ADD CONSTRAINT FK_transaction_document FOREIGN KEY (document_id) REFERENCES Document(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transaction_category') THEN
        ALTER TABLE transaction ADD CONSTRAINT FK_transaction_category FOREIGN KEY (category_id) REFERENCES Category(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transaction_bommel') THEN
        ALTER TABLE transaction ADD CONSTRAINT FK_transaction_bommel FOREIGN KEY (bommel_id) REFERENCES Bommel(id);
    END IF;

    -- Rename tags table if needed
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'transactionrecord_tags') THEN
        ALTER TABLE transactionrecord_tags RENAME TO transaction_tags;
        ALTER TABLE transaction_tags RENAME COLUMN transactionrecord_id TO transaction_id;
    END IF;
END $$;
