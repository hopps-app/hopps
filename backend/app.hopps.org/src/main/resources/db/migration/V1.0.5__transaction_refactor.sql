-- Refactor TransactionRecord to Transaction with proper relationships

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
-- First check if constraint exists, only add if it doesn't
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
