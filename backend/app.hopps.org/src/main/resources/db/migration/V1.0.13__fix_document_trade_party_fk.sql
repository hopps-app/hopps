-- Fix FK constraints on Document table that incorrectly reference 'tradeparty' instead of 'trade_party'
--
-- Issue: Migration V1.0.3 created FK constraints referencing 'TradeParty' (case-insensitive -> 'tradeparty'),
-- but the actual table used by the entity is 'trade_party' (from V1.0.0).
-- This causes constraint violations when inserting TradeParty records.

-- Drop the incorrect FK constraints if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_document_sender') THEN
        ALTER TABLE document DROP CONSTRAINT fk_document_sender;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_document_recipient') THEN
        ALTER TABLE document DROP CONSTRAINT fk_document_recipient;
    END IF;
END $$;

-- Recreate FK constraints pointing to the correct table
ALTER TABLE document ADD CONSTRAINT FK_document_sender
    FOREIGN KEY (sender_id) REFERENCES trade_party(id);

ALTER TABLE document ADD CONSTRAINT FK_document_recipient
    FOREIGN KEY (recipient_id) REFERENCES trade_party(id);

-- Drop the unused 'tradeparty' table and sequence created by V1.0.3
DROP TABLE IF EXISTS tradeparty CASCADE;
DROP SEQUENCE IF EXISTS tradeparty_seq;
