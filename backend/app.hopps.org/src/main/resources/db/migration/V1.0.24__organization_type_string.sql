-- Organization.type moves from an ORDINAL smallint to the enum name.
-- The old column was `smallint not null check (type between 0 and 1)`, which blocked any additional legal form and
-- silently tied the stored value to the declaration order of Organization.TYPE. Storing the name instead makes the
-- enum reorderable and the data readable.
--
-- Old ordinals: 0 = EINGETRAGENER_VEREIN, 1 = ANDERE.

ALTER TABLE organization DROP CONSTRAINT IF EXISTS organization_type_check;

ALTER TABLE organization
    ALTER COLUMN type TYPE varchar(64)
        USING CASE type
                  WHEN 0 THEN 'EINGETRAGENER_VEREIN'
                  WHEN 1 THEN 'ANDERE'
            END;

-- Fail loudly rather than silently writing NULL if an unexpected ordinal was present.
ALTER TABLE organization ALTER COLUMN type SET NOT NULL;

ALTER TABLE organization
    ADD CONSTRAINT organization_type_check CHECK (type IN (
        'EINGETRAGENER_VEREIN',
        'GEMEINNUETZIGE_GMBH',
        'STIFTUNG',
        'GEMEINNUETZIGE_GENOSSENSCHAFT',
        'GEMEINNUETZIGE_UG',
        'ANDERE'
    ));
