-- Add organization_id to trade_party table (required by TradeParty entity)
-- The TradeParty entity requires an organization reference for multi-tenant security

ALTER TABLE trade_party ADD COLUMN IF NOT EXISTS organization_id bigint;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_trade_party_organization'
    ) THEN
        ALTER TABLE trade_party ADD CONSTRAINT FK_trade_party_organization
            FOREIGN KEY (organization_id) REFERENCES Organization(id);
    END IF;
END $$;

-- Make organization_id NOT NULL after setting default for existing rows
-- (existing rows without org_id will be handled by the application)
