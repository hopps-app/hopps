-- MT940 native import support: make schema optional and add file_type discriminator.
ALTER TABLE BankImport ALTER COLUMN schema_id DROP NOT NULL;
ALTER TABLE BankImport ADD COLUMN file_type VARCHAR(10) NOT NULL DEFAULT 'CSV';
