-- V1.0.1__transaction_tags.sql
create table TransactionRecord_tags
(
    TransactionRecord_id bigint not null references TransactionRecord,
    tags                 varchar(255)
);

alter table Member
    add unique (email);

-- V1.0.5__transaction_refactor.sql
-- Rename table TransactionRecord to Transaction
ALTER TABLE TransactionRecord RENAME TO Transaction;

-- Rename sequence
ALTER SEQUENCE TransactionRecord_SEQ RENAME TO Transaction_SEQ;

-- Add organization reference (required for multi-tenant security)
ALTER TABLE Transaction ADD COLUMN organization_id bigint;
ALTER TABLE Transaction ADD CONSTRAINT FK_transaction_organization
    FOREIGN KEY (organization_id) REFERENCES Organization(id);

-- Add document reference (replaces document_key string reference)
ALTER TABLE Transaction ADD COLUMN document_id bigint;
ALTER TABLE Transaction ADD CONSTRAINT FK_transaction_document
    FOREIGN KEY (document_id) REFERENCES Document(id);

-- Add category reference
ALTER TABLE Transaction ADD COLUMN category_id bigint;
ALTER TABLE Transaction ADD CONSTRAINT FK_transaction_category
    FOREIGN KEY (category_id) REFERENCES category(id);

-- Add area field for German nonprofit sectors
ALTER TABLE Transaction ADD COLUMN area varchar(50)
    CHECK (area IN ('IDEELL', 'ZWECKBETRIEB', 'VERMOEGENSVERWALTUNG', 'WIRTSCHAFTLICH'));

-- Add status field for draft/confirmed workflow
ALTER TABLE Transaction ADD COLUMN status varchar(20) DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'CONFIRMED'));

-- Add tax field (to match Document entity)
ALTER TABLE Transaction ADD COLUMN totalTax numeric(38, 2);

-- Add timestamps
ALTER TABLE Transaction ADD COLUMN created_at timestamp(6) with time zone DEFAULT NOW();
ALTER TABLE Transaction ADD COLUMN updated_at timestamp(6) with time zone;

-- Add proper foreign key for bommel (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_transaction_bommel'
    ) THEN
        ALTER TABLE Transaction ADD CONSTRAINT FK_transaction_bommel
            FOREIGN KEY (bommel_id) REFERENCES Bommel(id);
    END IF;
END $$;

-- Make document_key nullable (will be deprecated, replaced by document_id)
ALTER TABLE Transaction ALTER COLUMN document_key DROP NOT NULL;

-- Rename tags table
ALTER TABLE TransactionRecord_tags RENAME TO transaction_tags;
ALTER TABLE transaction_tags RENAME COLUMN TransactionRecord_id TO transaction_id;

-- Rename uploader column to created_by for consistency
ALTER TABLE Transaction RENAME COLUMN uploader TO created_by;

-- V1.0.6__fix_document_column_type.sql
-- Fix document column type: convert from smallint (ordinal enum) to varchar (string enum)

-- First, add a temporary column
ALTER TABLE Transaction ADD COLUMN document_type_temp varchar(20);

-- Convert existing values: 0 = INVOICE, 1 = RECEIPT (based on DocumentType enum ordinal)
UPDATE Transaction SET document_type_temp = CASE
    WHEN document = 0 THEN 'INVOICE'
    WHEN document = 1 THEN 'RECEIPT'
    ELSE NULL
END;

-- Drop the old column
ALTER TABLE Transaction DROP COLUMN document;

-- Rename the temp column to document
ALTER TABLE Transaction RENAME COLUMN document_type_temp TO document;

-- Add check constraint
ALTER TABLE Transaction ADD CONSTRAINT CHK_transaction_document_type
    CHECK (document IS NULL OR document IN ('INVOICE', 'RECEIPT'));

-- Make total nullable (transactions from document upload don't have a total until analysis completes)
ALTER TABLE Transaction ALTER COLUMN total DROP NOT NULL;

-- V1.0.7__remove_document_type.sql
-- Remove documentType column from Transaction and Document tables

-- Drop the check constraint on Transaction.document column
ALTER TABLE Transaction DROP CONSTRAINT IF EXISTS CHK_transaction_document_type;

-- Drop the document column from Transaction table
ALTER TABLE Transaction DROP COLUMN IF EXISTS document;

-- Drop the documentType column from Document table (it has an inline check constraint)
ALTER TABLE Document DROP COLUMN IF EXISTS documentType;

-- Update Flyway history
INSERT INTO flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)
VALUES
(4, '1.0.1', 'transaction tags', 'SQL', 'V1.0.1__transaction_tags.sql', 0, 'postgres', 0, true),
(5, '1.0.5', 'transaction refactor', 'SQL', 'V1.0.5__transaction_refactor.sql', 0, 'postgres', 0, true),
(6, '1.0.6', 'fix document column type', 'SQL', 'V1.0.6__fix_document_column_type.sql', 0, 'postgres', 0, true),
(7, '1.0.7', 'remove document type', 'SQL', 'V1.0.7__remove_document_type.sql', 0, 'postgres', 0, true);
