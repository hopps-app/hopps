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
