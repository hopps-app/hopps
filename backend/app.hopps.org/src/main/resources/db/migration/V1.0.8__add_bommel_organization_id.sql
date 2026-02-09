-- Add missing organization_id foreign key to bommel table
-- This should have been in the original schema but was missed

ALTER TABLE bommel ADD COLUMN IF NOT EXISTS organization_id bigint;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_bommel_organization'
    ) THEN
        ALTER TABLE bommel ADD CONSTRAINT FK_bommel_organization
            FOREIGN KEY (organization_id) REFERENCES organization(id);
    END IF;
END $$;
