-- Remove documentType column from Transaction and Document tables
-- We no longer differentiate between INVOICE and RECEIPT

-- Drop the check constraint on Transaction.document column
ALTER TABLE Transaction DROP CONSTRAINT IF EXISTS CHK_transaction_document_type;

-- Drop the document column from Transaction table
ALTER TABLE Transaction DROP COLUMN IF EXISTS document;

-- Drop the documentType column from Document table (it has an inline check constraint)
ALTER TABLE Document DROP COLUMN IF EXISTS documentType;
