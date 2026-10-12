-- New legal form VEREIN for associations outside Germany (Swiss and Austrian Vereine are no e.V.). The allowed values
-- are a check constraint (see V1.0.28), so it has to be widened together with OrganizationType.
ALTER TABLE organization DROP CONSTRAINT organization_type_check;

ALTER TABLE organization
    ADD CONSTRAINT organization_type_check CHECK (type IN (
        'EINGETRAGENER_VEREIN',
        'GEMEINNUETZIGE_GMBH',
        'STIFTUNG',
        'GEMEINNUETZIGE_GENOSSENSCHAFT',
        'GEMEINNUETZIGE_UG',
        'VEREIN',
        'ANDERE'
    ));
